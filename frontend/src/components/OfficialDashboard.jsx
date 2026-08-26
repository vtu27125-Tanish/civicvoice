import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  fetchReports, fetchAnalytics, fetchHotspots, fetchTrends,
  fetchHotspotTrends, fetchPriorityQueue, updateReportStatus, getPredictiveInsights
} from '../api';
import AnimatedCounter from './AnimatedCounter';
import ManageReportModal from './ManageReportModal';

const URGENCY_COLOR = { high: '#BA1A1A', medium: '#FEB700', low: '#003434' };
const STATUS_OPTIONS = ['reported', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];

function RadialProgress({ percent }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: 96, height: 96 }}>
      <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="48" cy="48" r={r} fill="transparent" stroke="var(--surface-container-high)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="transparent" stroke="var(--primary-container)" strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s ease-in-out' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 18, color: 'var(--primary)'
      }}>
        {percent}%
      </span>
    </div>
  );
}

const TREND_STYLE = {
  worsening: { icon: 'trending_up', color: '#BA1A1A', label: 'Worsening' },
  improving: { icon: 'trending_down', color: '#166534', label: 'Improving' },
  stable: { icon: 'trending_flat', color: 'var(--on-surface-variant)', label: 'Stable' }
};

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: 'dashboard' },
  { key: 'reports', label: 'All Reports', icon: 'list_alt' },
  { key: 'priority', label: 'Priority Queue', icon: 'priority_high' },
  { key: 'hotspots', label: 'Hotspot Trends', icon: 'location_on' }
];

export default function OfficialDashboard({ token, onLogout }) {
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [trends, setTrends] = useState([]);
  const [hotspotTrends, setHotspotTrends] = useState([]);
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [filters, setFilters] = useState({ category: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [navKey, setNavKey] = useState('overview');
  const [managingReportId, setManagingReportId] = useState(null);
  const [insights, setInsights] = useState(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const [reportsData, analyticsData, hotspotsData, trendsData, hotspotTrendsData, priorityData] = await Promise.all([
        fetchReports(token, activeFilters),
        fetchAnalytics(token),
        fetchHotspots(token).catch(() => ({ hotspots: [] })),
        fetchTrends(token).catch(() => ({ trends: [] })),
        fetchHotspotTrends(token).catch(() => ({ trends: [] })),
        fetchPriorityQueue(token).catch(() => [])
      ]);
      setReports(reportsData);
      setAnalytics(analyticsData);
      setHotspots(hotspotsData.hotspots || []);
      setTrends(trendsData.trends || []);
      setHotspotTrends(hotspotTrendsData.trends || []);
      setPriorityQueue(priorityData);

      if (reportsData && reportsData.length > 0) {
        getPredictiveInsights(token, reportsData).then(setInsights).catch(() => {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function handleStatusChange(id, status) {
    try {
      await updateReportStatus(token, id, status);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const mapCenter = reports.length > 0
    ? [reports[0].lat, reports[0].lng]
    : [13.0827, 80.2707];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 260, background: '#0F1629', borderRight: '1px solid rgba(124,58,237,0.12)',
        display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', top: 0, left: 0
      }}>
        <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 28 }}>neurology</span>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 18, background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Vexa AI
          </span>
        </div>

        <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const active = navKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setNavKey(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 8, border: 'none', textAlign: 'left', cursor: 'pointer',
                  background: active ? 'rgba(0,77,77,0.08)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
                  borderRight: active ? '3px solid var(--primary-container)' : '3px solid transparent',
                  fontWeight: active ? 700 : 500, fontSize: 14
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{
          marginTop: 'auto', padding: 20, background: 'var(--surface-container-low)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>Official Access</div>
            <button onClick={onLogout} className="logout-link" style={{ padding: 0 }}>Sign out</button>
          </div>
        </div>
      </aside>

      <main style={{ marginLeft: 260, flex: 1 }}>
        <div className="topbar">
          <h1 className="page-title" style={{ fontSize: 22, marginBottom: 0 }}>
            {NAV_ITEMS.find(n => n.key === navKey)?.label}
          </h1>
        </div>

        <div className="dashboard-shell" style={{ paddingTop: 24 }}>
          {error && <p className="error-text">{error}</p>}

          {navKey === 'overview' && (
            <>
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="card stat-card">
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', right: -8, bottom: -8, fontSize: 90, opacity: 0.06, color: 'var(--primary)'
                  }}>analytics</span>
                  <div className="stat-label">Total reports</div>
                  <div className="stat-value mono"><AnimatedCounter value={analytics?.total_reports} /></div>
                </div>

                <div className="card stat-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="stat-label">Resolution rate</div>
                    <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 4 }}>
                      {analytics?.resolved_total ?? 0} resolved total
                    </div>
                  </div>
                  <RadialProgress percent={analytics?.resolution_rate ?? 0} />
                </div>

                <div className="card stat-card">
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', right: -8, bottom: -8, fontSize: 90, opacity: 0.06, color: 'var(--primary)'
                  }}>task_alt</span>
                  <div className="stat-label">Resolved this week</div>
                  <div className="stat-value mono"><AnimatedCounter value={analytics?.resolved_this_week} /></div>
                </div>

                <div className="card stat-card" style={{ borderLeft: '4px solid var(--error-container)' }}>
                  <div className="stat-label">Active hotspots</div>
                  <div className="stat-value mono"><AnimatedCounter value={hotspots.length} /></div>
                  <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 4 }}>clustered by DBSCAN</div>
                </div>
              </div>

              {insights && (
                <div className="card" style={{ background: 'var(--surface-container-high)' }}>
                  <div className="label-caps" style={{ marginBottom: 12, color: 'var(--primary)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>neurology</span>
                    AI Predictive Insights
                  </div>
                  <p style={{ fontWeight: 500, marginBottom: 16 }}>{insights.generalTrend}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {(insights.categoriesAtRisk || []).map((risk, idx) => (
                      <div key={idx} style={{ padding: 12, background: 'var(--surface-container-highest)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <strong style={{ textTransform: 'capitalize' }}>{risk.category}</strong>
                          <span className={`tag urgency-${risk.riskLevel.toLowerCase()}`}>{risk.riskLevel} Risk</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: 0 }}>{risk.reason}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: 12, background: 'rgba(22, 101, 52, 0.1)', borderRadius: 8, border: '1px solid rgba(22, 101, 52, 0.2)' }}>
                    <strong style={{ color: '#166534', display: 'block', marginBottom: 4 }}>Suggested Actions</strong>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--on-surface-variant)' }}>
                      {(insights.suggestedActions || []).map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="card map-card">
                <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {hotspots.map((h, i) => (
                    <Circle
                      key={`hotspot-${i}`}
                      center={[h.cluster_lat, h.cluster_lng]}
                      radius={150}
                      pathOptions={{ color: '#BA1A1A', fillColor: '#BA1A1A', fillOpacity: 0.15, weight: 1 }}
                    >
                      <Popup>
                        <strong>Hotspot</strong><br />
                        {h.report_count} reports — mostly <span style={{ textTransform: 'capitalize' }}>{h.dominant_category}</span>
                      </Popup>
                    </Circle>
                  ))}
                  {reports.map((r) => (
                    <CircleMarker
                      key={r.id}
                      center={[r.lat, r.lng]}
                      radius={8}
                      pathOptions={{ color: URGENCY_COLOR[r.urgency_score] || '#003434', fillOpacity: 0.75 }}
                    >
                      <Popup>
                        <strong style={{ textTransform: 'capitalize' }}>{r.category}</strong><br />
                        {r.description.slice(0, 80)}...<br />
                        Status: {r.status}
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>

              <div className="card">
                <div className="label-caps" style={{ marginBottom: 12 }}>Reports over the last 14 days</div>
                {trends.length === 0 ? (
                  <div className="empty-state">Not enough data yet to show a trend.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                      <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} allowDecimals={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="submitted" stroke="#003434" strokeWidth={2} name="Submitted" />
                      <Line type="monotone" dataKey="resolved" stroke="#FEB700" strokeWidth={2} name="Resolved" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}

          {navKey === 'reports' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <a
                  href={`http://localhost:5000/api/reports/export/csv?token=${token}`}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                  Export CSV
                </a>
              </div>
              <div className="filter-row">
                <select
                  className="filter-select"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option value="">All categories</option>
                  <option value="pothole">Pothole</option>
                  <option value="water">Water</option>
                  <option value="electricity">Electricity</option>
                  <option value="garbage">Garbage</option>
                  <option value="sewage">Sewage</option>
                  <option value="streetlight">Streetlight</option>
                  <option value="other">Other</option>
                </select>

                <select
                  className="filter-select"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="empty-state">Loading reports…</div>
              ) : reports.length === 0 ? (
                <div className="empty-state">No reports match these filters.</div>
              ) : (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>ID</th><th>Category</th><th>Urgency</th><th>Description</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id}>
                        <td className="mono">#{r.id}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
                        <td><span className={`tag urgency-${r.urgency_score}`}>{r.urgency_score}</span></td>
                        <td style={{ maxWidth: 280 }}>{r.description.slice(0, 60)}{r.description.length > 60 ? '…' : ''}</td>
                        <td>
                          <select
                            className="status-select"
                            value={r.status}
                            onChange={(e) => handleStatusChange(r.id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setManagingReportId(r.id)}>
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {navKey === 'priority' && (
            <div className="card">
              <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginBottom: 16 }}>
                Sorted by urgency + hotspot density + time waiting — work top to bottom for maximum impact.
              </p>
              {priorityQueue.length === 0 ? (
                <div className="empty-state">Queue is empty — nothing open right now.</div>
              ) : (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Score</th><th>ID</th><th>Category</th><th>Urgency</th><th>Votes</th><th>In hotspot</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorityQueue.map((r) => (
                      <tr key={r.id}>
                        <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>{r.priority_score}</td>
                        <td className="mono">#{r.id}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
                        <td><span className={`tag urgency-${r.urgency_score}`}>{r.urgency_score}</span></td>
                        <td className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--on-surface-variant)' }}>thumb_up</span>
                          {r.vote_count || 0}
                        </td>
                        <td>{r.in_hotspot ? <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#BA1A1A' }}>whatshot</span> : '—'}</td>
                        <td>
                          <select
                            className="status-select"
                            value={r.status}
                            onChange={(e) => handleStatusChange(r.id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {navKey === 'hotspots' && (
            <div className="card">
              <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginBottom: 16 }}>
                Compares each hotspot's earliest vs most recent reading to show whether it's getting better or worse.
                Needs at least 2 dashboard loads over time to build history.
              </p>
              {hotspotTrends.length === 0 ? (
                <div className="empty-state">Not enough history yet — check back after a few dashboard sessions.</div>
              ) : (
                hotspotTrends.map((t, i) => {
                  const style = TREND_STYLE[t.trend];
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 4px', borderBottom: i < hotspotTrends.length - 1 ? '1px solid var(--outline-variant)' : 'none'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize', color: 'var(--primary)' }}>
                          {t.category} cluster
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>
                          {t.lat.toFixed(3)}, {t.lng.toFixed(3)} — {t.readings} readings
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: style.color, fontWeight: 700, fontSize: 13 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{style.icon}</span>
                          {style.label}
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>
                          {t.first_count} → {t.latest_count} reports
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>

      {managingReportId && (
        <ManageReportModal
          token={token}
          reportId={managingReportId}
          onClose={() => setManagingReportId(null)}
          onChanged={loadData}
        />
      )}
    </div>
  );
}