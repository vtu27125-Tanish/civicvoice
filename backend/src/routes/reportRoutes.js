const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const rateLimit = require('express-rate-limit');
const { sendStatusUpdateEmail } = require('../utils/mailer');
const { moderateComment } = require('../utils/moderation');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// Max 10 report submissions per hour per citizen — prevents spam/abuse
// while still allowing someone to report several genuine separate issues.
const submitReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  message: { error: 'Too many reports submitted. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Max 20 comments per hour per citizen — separate, higher limit than
// reports since discussion is expected to be more frequent
const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  message: { error: 'Too many comments posted. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false
});

const router = express.Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// POST /api/reports  -> citizen submits a new report
router.post(
  '/',
  authenticate,
  submitReportLimiter,
  [
    body('description').notEmpty().withMessage('Description is required'),
    body('lat').isFloat().withMessage('Latitude is required'),
    body('lng').isFloat().withMessage('Longitude is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      description,
      transcript = null,
      original_language = 'en',
      lat,
      lng,
      address_text = null
    } = req.body;

    try {
      // Call ML microservice to classify category + urgency (falls back gracefully if ML service is down)
      let category = 'other';
      let urgency_score = 'medium';
      let translated_text = null;
      try {
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/classify`, { text: description, language: original_language });
        category = mlResponse.data.category || 'other';
        urgency_score = mlResponse.data.urgency || 'medium';
        translated_text = mlResponse.data.translated_text || null;
      } catch (mlErr) {
        console.warn('ML service unavailable, using defaults:', mlErr.message);
      }

      // Map category to department
      const [deptRows] = await pool.query(
        'SELECT id FROM departments WHERE category_mapping = ? LIMIT 1',
        [category]
      );
      const department_id = deptRows.length > 0 ? deptRows[0].id : null;

      // Check for duplicates: find recent open reports in the same category
      // near this location, then ask the ML service to compare text similarity.
      let is_duplicate = false;
      let duplicate_of = null;
      try {
        const [nearby] = await pool.query(
          `SELECT id, description FROM reports 
           WHERE category = ? AND status NOT IN ('resolved', 'rejected')
           AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
           ORDER BY created_at DESC LIMIT 20`,
          [category, lat - 0.003, lat + 0.003, lng - 0.003, lng + 0.003]
        );
        if (nearby.length > 0) {
          const dupResponse = await axios.post(`${ML_SERVICE_URL}/check-duplicate`, {
            new_text: description,
            candidates: nearby.map(r => ({ id: r.id, text: r.description }))
          });
          if (dupResponse.data.duplicate_of) {
            is_duplicate = true;
            duplicate_of = dupResponse.data.duplicate_of;
          }
        }
      } catch (dupErr) {
        console.warn('Duplicate check unavailable:', dupErr.message);
      }

      const [result] = await pool.query(
        `INSERT INTO reports 
         (user_id, category, description, transcript, original_language, urgency_score, department_id, lat, lng, address_text, is_duplicate) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, category, description, transcript, original_language, urgency_score, department_id, lat, lng, address_text, is_duplicate]
      );

      if (is_duplicate && duplicate_of) {
        await pool.query(
          'INSERT INTO duplicate_links (original_report_id, duplicate_report_id, similarity_score) VALUES (?, ?, ?)',
          [duplicate_of, result.insertId, 0.6]
        );
      }

      await pool.query(
        'INSERT INTO report_status_history (report_id, status) VALUES (?, ?)',
        [result.insertId, 'reported']
      );

      // Emit real-time event to connected dashboards
      const io = req.app.get('io');
      if (io) io.emit('new_report', { id: result.insertId, category, urgency_score, lat, lng });

      // Run Gemini Auto-Agent asynchronously in the background
      axios.post(`http://localhost:${process.env.PORT || 5000}/api/gemini/auto-agent`, {
        newIssue: { id: result.insertId, category, severity: urgency_score, lat, lng },
        existingIssues: nearby
      }).then(async (agentRes) => {
        const agentData = agentRes.data;
        if (agentData && agentData.priorityScore) {
          // Update the DB with the priority score
          await pool.query('UPDATE reports SET priority_score = ? WHERE id = ?', [agentData.priorityScore, result.insertId]);
          // Add dispatch note as a comment
          if (agentData.dispatchNote) {
            await pool.query(
              'INSERT INTO report_status_history (report_id, status, updated_by, notes) VALUES (?, ?, ?, ?)',
              [result.insertId, 'reported', null, agentData.dispatchNote]
            );
          }
        }
      }).catch(err => console.error("Auto-agent failed:", err.message));

      res.status(201).json({
        id: result.insertId,
        category,
        urgency_score,
        status: 'reported',
        department_id,
        is_duplicate,
        duplicate_of,
        translated_text
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error while submitting report' });
    }
  }
);

// GET /api/reports  -> list with filters (category, status, urgency)
router.get('/', authenticate, async (req, res) => {
  const { category, status, urgency_score } = req.query;
  let query = `SELECT r.*, 
    (SELECT COUNT(*) FROM report_votes v WHERE v.report_id = r.id) AS vote_count,
    (SELECT COUNT(*) FROM report_votes v WHERE v.report_id = r.id AND v.user_id = ?) AS has_voted
    FROM reports r WHERE 1=1`;
  const params = [req.user.id];

  // Citizens only see their own reports; officials see their department's
  // reports; admins see everything.
  if (req.user.role === 'citizen') {
    query += ' AND user_id = ?';
    params.push(req.user.id);
  } else if (req.user.role === 'official' && req.user.department_id) {
    query += ' AND department_id = ?';
    params.push(req.user.department_id);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (urgency_score) {
    query += ' AND urgency_score = ?';
    params.push(urgency_score);
  }
  query += ' ORDER BY created_at DESC';

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching reports' });
  }
});

// GET /api/reports/:id -> single report detail with status history
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [report] = await pool.query('SELECT * FROM reports WHERE id = ?', [req.params.id]);
    if (report.length === 0) return res.status(404).json({ error: 'Report not found' });

    const [history] = await pool.query(
      'SELECT * FROM report_status_history WHERE report_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    const [images] = await pool.query('SELECT * FROM report_images WHERE report_id = ?', [req.params.id]);

    res.json({ ...report[0], history, images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching report' });
  }
});

// PATCH /api/reports/:id/status -> official updates status
router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles('official', 'admin'),
  [body('status').isIn(['reported', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { status, notes = null } = req.body;

    try {
      await pool.query('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id]);
      await pool.query(
        'INSERT INTO report_status_history (report_id, status, updated_by, notes) VALUES (?, ?, ?, ?)',
        [req.params.id, status, req.user.id, notes]
      );

      // Notify the citizen who filed the report — non-blocking, failures are logged not thrown
      const [reportRows] = await pool.query(
        `SELECT r.category, r.user_id, u.email FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?`,
        [req.params.id]
      );
      if (reportRows.length > 0) {
        sendStatusUpdateEmail(reportRows[0].email, req.params.id, reportRows[0].category, status);
        await pool.query(
          'INSERT INTO notifications (user_id, report_id, type, message) VALUES (?, ?, ?, ?)',
          [reportRows[0].user_id, req.params.id, 'status_change',
           `Your ${reportRows[0].category} report #${req.params.id} is now ${status.replace('_', ' ')}`]
        );
      }

      const io = req.app.get('io');
      if (io) io.emit('status_update', { report_id: req.params.id, status });

      res.json({ report_id: req.params.id, status });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error while updating status' });
    }
  }
);

// GET /api/reports/analytics/summary -> official dashboard stats
router.get('/analytics/summary', authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  try {
    const deptFilter = (req.user.role === 'official' && req.user.department_id) ? req.user.department_id : null;
    const deptClause = deptFilter ? 'WHERE department_id = ?' : '';
    const deptClauseAnd = deptFilter ? 'AND department_id = ?' : '';
    const deptParams = deptFilter ? [deptFilter] : [];

    const [totals] = await pool.query(`SELECT COUNT(*) AS total FROM reports ${deptClause}`, deptParams);
    const [resolvedThisWeek] = await pool.query(
      `SELECT COUNT(*) AS resolved FROM reports 
       WHERE status = 'resolved' AND updated_at >= NOW() - INTERVAL 7 DAY ${deptClauseAnd}`,
      deptParams
    );
    const [resolvedTotal] = await pool.query(
      `SELECT COUNT(*) AS resolved FROM reports WHERE status = 'resolved' ${deptClauseAnd}`,
      deptParams
    );
    const [topCategory] = await pool.query(
      `SELECT category, COUNT(*) AS count FROM reports ${deptClause}
       GROUP BY category ORDER BY count DESC LIMIT 1`,
      deptParams
    );

    const total = totals[0].total;
    const resolvedCount = resolvedTotal[0].resolved;
    const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

    res.json({
      total_reports: total,
      resolved_this_week: resolvedThisWeek[0].resolved,
      resolved_total: resolvedCount,
      resolution_rate: resolutionRate,
      top_category: topCategory[0] || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching analytics' });
  }
});

// GET /api/reports/analytics/hotspot-trends -> is each hotspot area getting
// worse or better over time? Compares the earliest vs latest saved snapshot
// for each approximate location (snapshots accumulate every time the
// dashboard loads /analytics/hotspots).
router.get('/analytics/hotspot-trends', authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  try {
    const [snapshots] = await pool.query(
      `SELECT ROUND(cluster_lat, 3) AS glat, ROUND(cluster_lng, 3) AS glng, 
              report_count, dominant_category, last_updated
       FROM hotspots ORDER BY last_updated ASC`
    );

    // Group snapshots by rounded lat/lng (~100m grid cell) to treat as "the same" hotspot over time
    const groups = {};
    snapshots.forEach(s => {
      const key = `${s.glat},${s.glng}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    const trends = Object.entries(groups)
      .filter(([, points]) => points.length >= 2) // need at least 2 readings to show a trend
      .map(([key, points]) => {
        const [glat, glng] = key.split(',').map(Number);
        const first = points[0];
        const latest = points[points.length - 1];
        const change = latest.report_count - first.report_count;
        const changePct = first.report_count > 0 ? Math.round((change / first.report_count) * 100) : 0;

        let trend = 'stable';
        if (change > 0) trend = 'worsening';
        if (change < 0) trend = 'improving';

        return {
          lat: glat,
          lng: glng,
          category: latest.dominant_category,
          first_count: first.report_count,
          latest_count: latest.report_count,
          change_pct: changePct,
          trend,
          readings: points.length
        };
      })
      .sort((a, b) => b.latest_count - a.latest_count);

    res.json({ trends });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while computing hotspot trends' });
  }
});

// GET /api/reports/analytics/hotspots -> clustered hotspot data for the map
router.get('/analytics/hotspots', authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  try {
    const [reports] = await pool.query(
      `SELECT id, lat, lng, category FROM reports 
       WHERE status NOT IN ('resolved', 'rejected')`
    );

    if (reports.length < 3) {
      return res.json({ hotspots: [] });
    }

    const mlResponse = await axios.post(`${ML_SERVICE_URL}/cluster-hotspots`, {
      reports: reports.map(r => ({ id: r.id, lat: r.lat, lng: r.lng, category: r.category })),
      min_samples: 3
    });

    // Cache the computed hotspots in the DB for later reference/analytics
    const hotspots = mlResponse.data.hotspots;
    for (const h of hotspots) {
      await pool.query(
        `INSERT INTO hotspots (cluster_lat, cluster_lng, report_count, dominant_category) 
         VALUES (?, ?, ?, ?)`,
        [h.cluster_lat, h.cluster_lng, h.report_count, h.dominant_category]
      );
    }

    res.json({ hotspots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while computing hotspots' });
  }
});

// POST /api/reports/chatbot -> citizen chatbot, resolves report IDs mentioned in the message
router.post('/chatbot', authenticate, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    // Look for a report number like "#12" or "12" in the message
    const idMatch = message.match(/#?(\d+)/);
    let reportContext = {};

    if (idMatch) {
      const reportId = parseInt(idMatch[1], 10);
      const [rows] = await pool.query(
        'SELECT id, status, category FROM reports WHERE id = ? AND user_id = ?',
        [reportId, req.user.id]
      );
      if (rows.length > 0) {
        reportContext = {
          report_id: rows[0].id,
          report_status: rows[0].status,
          category: rows[0].category
        };
      }
    }

    const mlResponse = await axios.post(`${ML_SERVICE_URL}/chatbot`, {
      message,
      ...reportContext
    });

    res.json(mlResponse.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chatbot service unavailable' });
  }
});

// POST /api/reports/verify-photo -> forwards an uploaded photo to the ML
// service for quality/authenticity checks before the citizen submits it.
router.post('/verify-photo', authenticate, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo provided' });

  try {
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: req.file.originalname || 'photo.jpg' });

    const mlResponse = await axios.post(`${ML_SERVICE_URL}/verify-image`, form, {
      headers: form.getHeaders()
    });

    res.json(mlResponse.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Photo verification unavailable right now' });
  }
});

// GET /api/reports/analytics/trends -> daily report volume + resolutions, last 14 days
router.get('/analytics/trends', authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  try {
    const deptFilter = (req.user.role === 'official' && req.user.department_id) ? req.user.department_id : null;
    const deptClause = deptFilter ? 'AND department_id = ?' : '';
    const params = deptFilter ? [deptFilter] : [];

    const [submitted] = await pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS count 
       FROM reports 
       WHERE created_at >= CURDATE() - INTERVAL 14 DAY ${deptClause}
       GROUP BY DATE(created_at) ORDER BY day ASC`,
      params
    );

    const [resolved] = await pool.query(
      `SELECT DATE(updated_at) AS day, COUNT(*) AS count 
       FROM reports 
       WHERE status = 'resolved' AND updated_at >= CURDATE() - INTERVAL 14 DAY ${deptClause}
       GROUP BY DATE(updated_at) ORDER BY day ASC`,
      params
    );

    // Merge into a single day-indexed series so the frontend can plot both lines together
    const dayMap = {};
    submitted.forEach(r => {
      const day = r.day.toISOString().split('T')[0];
      dayMap[day] = { day, submitted: r.count, resolved: 0 };
    });
    resolved.forEach(r => {
      const day = r.day.toISOString().split('T')[0];
      if (!dayMap[day]) dayMap[day] = { day, submitted: 0, resolved: 0 };
      dayMap[day].resolved = r.count;
    });

    const series = Object.values(dayMap).sort((a, b) => a.day.localeCompare(b.day));
    res.json({ trends: series });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching trends' });
  }
});

// GET /api/reports/feed -> recent community reports for the citizen home page
// (no PII — category, status, urgency, and rough location only)
router.get('/feed', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.category, r.status, r.urgency_score, r.created_at, r.lat, r.lng,
        (SELECT COUNT(*) FROM report_votes v WHERE v.report_id = r.id) AS vote_count,
        (SELECT COUNT(*) FROM report_votes v WHERE v.report_id = r.id AND v.user_id = ?) AS has_voted
       FROM reports r ORDER BY r.created_at DESC LIMIT 15`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching feed' });
  }
});

// POST /api/reports/:id/vote -> toggle an upvote from the current citizen.
// One vote per citizen per report; voting again removes it (toggle behavior).
// Citizens cannot vote on their own report.
router.post('/:id/vote', authenticate, async (req, res) => {
  try {
    const [reportRows] = await pool.query('SELECT user_id FROM reports WHERE id = ?', [req.params.id]);
    if (reportRows.length === 0) return res.status(404).json({ error: 'Report not found' });
    if (reportRows[0].user_id === req.user.id) {
      return res.status(400).json({ error: "You can't vote on your own report" });
    }

    const [existing] = await pool.query(
      'SELECT id FROM report_votes WHERE report_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    let voted;
    if (existing.length > 0) {
      await pool.query('DELETE FROM report_votes WHERE id = ?', [existing[0].id]);
      voted = false;
    } else {
      await pool.query('INSERT INTO report_votes (report_id, user_id) VALUES (?, ?)', [req.params.id, req.user.id]);
      voted = true;
    }

    const [[{ vote_count }]] = await pool.query(
      'SELECT COUNT(*) AS vote_count FROM report_votes WHERE report_id = ?',
      [req.params.id]
    );

    const io = req.app.get('io');
    if (io) io.emit('vote_update', { report_id: req.params.id, vote_count });

    res.json({ report_id: req.params.id, voted, vote_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while voting' });
  }
});

// GET /api/reports/priority-queue -> reports sorted by computed priority
// (urgency weight + bonus if the report sits inside an active hotspot),
// so officials work the most impactful issues first instead of just newest-first.
router.get('/priority-queue', authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  try {
    const deptFilter = (req.user.role === 'official' && req.user.department_id) ? req.user.department_id : null;
    const deptClause = deptFilter ? 'AND department_id = ?' : '';
    const params = deptFilter ? [deptFilter] : [];

    const [reports] = await pool.query(
      `SELECT r.*, (SELECT COUNT(*) FROM report_votes v WHERE v.report_id = r.id) AS vote_count
       FROM reports r
       WHERE r.status NOT IN ('resolved', 'rejected') ${deptClause}`,
      params
    );

    const [recentHotspots] = await pool.query(
      `SELECT cluster_lat, cluster_lng FROM hotspots 
       WHERE last_updated >= NOW() - INTERVAL 1 DAY`
    );

    const URGENCY_WEIGHT = { high: 30, medium: 15, low: 5 };
    const HOTSPOT_RADIUS_DEGREES = 150 / 111000; // ~150m, matches the clustering radius

    function isInHotspot(lat, lng) {
      return recentHotspots.some(h =>
        Math.abs(h.cluster_lat - lat) < HOTSPOT_RADIUS_DEGREES &&
        Math.abs(h.cluster_lng - lng) < HOTSPOT_RADIUS_DEGREES
      );
    }

    const scored = reports.map(r => {
      let score = URGENCY_WEIGHT[r.urgency_score] || 10;
      const inHotspot = isInHotspot(r.lat, r.lng);
      if (inHotspot) score += 20;
      // Community votes are a human confirmation signal — each vote adds
      // weight, capped so one viral report can't drown out real urgency
      score += Math.min(r.vote_count * 4, 20);
      // Slightly favor older unresolved reports so nothing sits forgotten
      const ageHours = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60);
      score += Math.min(ageHours / 4, 10);

      return { ...r, priority_score: Math.round(score), in_hotspot: inHotspot };
    });

    scored.sort((a, b) => b.priority_score - a.priority_score);

    res.json(scored);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while building priority queue' });
  }
});

// GET /api/reports/:id/duplicates -> linked duplicates (both directions) +
// unlinked candidate reports in the same category nearby, for manual review
router.get('/:id/duplicates', authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  try {
    const [reportRows] = await pool.query('SELECT * FROM reports WHERE id = ?', [req.params.id]);
    if (reportRows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const report = reportRows[0];

    // Reports already linked as duplicates of this one, or this one linked to another
    const [linked] = await pool.query(
      `SELECT dl.id AS link_id, dl.similarity_score,
              CASE WHEN dl.original_report_id = ? THEN dl.duplicate_report_id ELSE dl.original_report_id END AS linked_report_id
       FROM duplicate_links dl
       WHERE dl.original_report_id = ? OR dl.duplicate_report_id = ?`,
      [req.params.id, req.params.id, req.params.id]
    );

    let linkedReports = [];
    if (linked.length > 0) {
      const ids = linked.map(l => l.linked_report_id);
      const [rows] = await pool.query(
        `SELECT * FROM reports WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      linkedReports = rows.map(r => ({
        ...r,
        link_id: linked.find(l => l.linked_report_id === r.id)?.link_id,
        similarity_score: linked.find(l => l.linked_report_id === r.id)?.similarity_score
      }));
    }

    // Unlinked candidates: same category, nearby, not already linked, not itself
    const excludeIds = [parseInt(req.params.id), ...linked.map(l => l.linked_report_id)];
    const [candidates] = await pool.query(
      `SELECT * FROM reports 
       WHERE category = ? AND id NOT IN (${excludeIds.map(() => '?').join(',')})
       AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
       AND status NOT IN ('resolved', 'rejected')
       ORDER BY created_at DESC LIMIT 10`,
      [report.category, ...excludeIds, report.lat - 0.005, report.lat + 0.005, report.lng - 0.005, report.lng + 0.005]
    );

    res.json({ report, linked: linkedReports, candidates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching duplicates' });
  }
});

// POST /api/reports/:id/merge -> official manually marks :id as a duplicate of original_report_id
router.post('/:id/merge', authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  const { original_report_id } = req.body;
  if (!original_report_id) return res.status(400).json({ error: 'original_report_id is required' });
  if (parseInt(original_report_id) === parseInt(req.params.id)) {
    return res.status(400).json({ error: "A report can't be a duplicate of itself" });
  }

  try {
    const [existing] = await pool.query(
      `SELECT id FROM duplicate_links 
       WHERE (original_report_id = ? AND duplicate_report_id = ?) OR (original_report_id = ? AND duplicate_report_id = ?)`,
      [original_report_id, req.params.id, req.params.id, original_report_id]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'These reports are already linked' });

    await pool.query(
      'INSERT INTO duplicate_links (original_report_id, duplicate_report_id, similarity_score) VALUES (?, ?, ?)',
      [original_report_id, req.params.id, 1.0] // 1.0 marks it as a manual/human-confirmed merge, not AI-estimated
    );
    await pool.query('UPDATE reports SET is_duplicate = TRUE WHERE id = ?', [req.params.id]);

    res.json({ merged: true, original_report_id, duplicate_report_id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while merging reports' });
  }
});

// DELETE /api/reports/:id/merge/:linkId -> official undoes a duplicate link
router.delete('/:id/merge/:linkId', authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM duplicate_links WHERE id = ?', [req.params.linkId]);

    // Only clear is_duplicate if this report has no other duplicate links left
    const [remaining] = await pool.query(
      'SELECT id FROM duplicate_links WHERE original_report_id = ? OR duplicate_report_id = ?',
      [req.params.id, req.params.id]
    );
    if (remaining.length === 0) {
      await pool.query('UPDATE reports SET is_duplicate = FALSE WHERE id = ?', [req.params.id]);
    }

    res.json({ unmerged: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while unmerging reports' });
  }
});

// PATCH /api/reports/:id/reassign -> official manually reassigns department (and optionally category)
router.patch('/:id/reassign', authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  const { department_id, category } = req.body;

  try {
    const updates = [];
    const params = [];
    if (department_id) { updates.push('department_id = ?'); params.push(department_id); }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.id);
    await pool.query(`UPDATE reports SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ reassigned: true, department_id, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while reassigning report' });
  }
});

// GET /api/reports/departments/list -> for the reassignment dropdown
router.get('/departments/list', authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, category_mapping FROM departments');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching departments' });
  }
});

// GET /api/reports/export/csv -> download all (department-scoped) reports as CSV
// Accepts the JWT via query param (?token=) as well as the Authorization header,
// since a plain <a href> download link can't set custom headers.
router.get('/export/csv', (req, res, next) => {
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  try {
    const deptFilter = (req.user.role === 'official' && req.user.department_id) ? req.user.department_id : null;
    const deptClause = deptFilter ? 'WHERE r.department_id = ?' : '';
    const params = deptFilter ? [deptFilter] : [];

    const [rows] = await pool.query(
      `SELECT r.id, r.category, r.status, r.urgency_score, r.description, 
              r.lat, r.lng, r.is_duplicate, r.created_at, r.updated_at,
              d.name AS department_name,
              (SELECT COUNT(*) FROM report_votes v WHERE v.report_id = r.id) AS vote_count
       FROM reports r
       LEFT JOIN departments d ON r.department_id = d.id
       ${deptClause}
       ORDER BY r.created_at DESC`,
      params
    );

    const headers = ['ID', 'Category', 'Status', 'Urgency', 'Description', 'Latitude', 'Longitude', 'Is Duplicate', 'Department', 'Votes', 'Created At', 'Updated At'];

    // Escapes a CSV field: wraps in quotes and doubles any internal quotes
    // if it contains a comma, quote, or newline — otherwise left as-is.
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };

    const csvRows = rows.map(r => [
      r.id, r.category, r.status, r.urgency_score, r.description,
      r.lat, r.lng, r.is_duplicate ? 'Yes' : 'No', r.department_name || '',
      r.vote_count, r.created_at.toISOString(), r.updated_at.toISOString()
    ].map(escapeCsv).join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="civicvoice_reports_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while exporting CSV' });
  }
});

// GET /api/reports/:id/comments -> public comment thread for a report.
// Citizens see approved comments only; officials/admins also see flagged
// ones (for moderation) plus who flagged for what reason.
router.get('/:id/comments', authenticate, async (req, res) => {
  try {
    const isModerator = req.user.role === 'official' || req.user.role === 'admin';
    const visibilityClause = isModerator ? '' : 'AND c.is_hidden = FALSE';

    const [rows] = await pool.query(
      `SELECT c.id, c.text, c.is_flagged, c.flagged_reason, c.is_hidden, c.created_at,
              u.name AS author_name, c.user_id
       FROM report_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.report_id = ? ${visibilityClause}
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching comments' });
  }
});

// POST /api/reports/:id/comments -> citizen posts a comment.
// Runs lightweight moderation; flagged comments are stored but hidden
// pending official review rather than silently deleted.
router.post('/:id/comments', authenticate, commentLimiter, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });
  if (text.length > 500) return res.status(400).json({ error: 'Comment is too long (max 500 characters)' });

  try {
    const { flagged, reason } = moderateComment(text);

    const [result] = await pool.query(
      'INSERT INTO report_comments (report_id, user_id, text, is_flagged, flagged_reason, is_hidden) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, req.user.id, text.trim(), flagged, reason, flagged]
    );

    // Notify the report owner if someone else commented (skip if they commented on their own report)
    if (!flagged) {
      const [reportOwner] = await pool.query('SELECT user_id, category FROM reports WHERE id = ?', [req.params.id]);
      if (reportOwner.length > 0 && reportOwner[0].user_id !== req.user.id) {
        await pool.query(
          'INSERT INTO notifications (user_id, report_id, type, message) VALUES (?, ?, ?, ?)',
          [reportOwner[0].user_id, req.params.id, 'new_comment', `New comment on your ${reportOwner[0].category} report #${req.params.id}`]
        );
      }
    }

    const io = req.app.get('io');
    if (io && !flagged) io.emit('new_comment', { report_id: req.params.id, comment_id: result.insertId });

    res.status(201).json({
      id: result.insertId,
      flagged,
      message: flagged
        ? 'Your comment was submitted and is pending review before it appears publicly.'
        : 'Comment posted.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while posting comment' });
  }
});

// PATCH /api/reports/:id/comments/:commentId/approve -> official approves a flagged comment
router.patch('/:id/comments/:commentId/approve', authenticate, authorizeRoles('official', 'admin'), async (req, res) => {
  try {
    await pool.query(
      'UPDATE report_comments SET is_hidden = FALSE WHERE id = ?',
      [req.params.commentId]
    );
    res.json({ approved: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while approving comment' });
  }
});

// DELETE /api/reports/:id/comments/:commentId -> official removes a comment, or the author removes their own
router.delete('/:id/comments/:commentId', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id FROM report_comments WHERE id = ?', [req.params.commentId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });

    const isOwner = rows[0].user_id === req.user.id;
    const isModerator = req.user.role === 'official' || req.user.role === 'admin';
    if (!isOwner && !isModerator) return res.status(403).json({ error: 'Not authorized to delete this comment' });

    await pool.query('DELETE FROM report_comments WHERE id = ?', [req.params.commentId]);
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while deleting comment' });
  }
});

// GET /api/reports/notifications/list -> current user's recent notifications
router.get('/notifications/list', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching notifications' });
  }
});

// PATCH /api/reports/notifications/:id/read -> mark one notification as read
router.patch('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ read: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while updating notification' });
  }
});

// PATCH /api/reports/notifications/read-all -> mark all of the current user's notifications as read
router.patch('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    res.json({ read: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while updating notifications' });
  }
});

module.exports = router;