import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchFeed, voteReport } from '../api';
import DisplayCards from './DisplayCards';
import CommentSection from './CommentSection';
import HowItWorks from './HowItWorks';
import NotificationBell from './NotificationBell';
import { FeedCardSkeleton } from './Skeletons';
import { useToast } from './Toast';

const CATEGORY_ICON = {
  pothole: 'construction', water: 'water_drop', electricity: 'bolt',
  garbage: 'delete', sewage: 'water_damage', streetlight: 'lightbulb', other: 'report'
};

const CATEGORY_COLOR = {
  pothole: '#FF8C42', water: '#4F8EFF', electricity: '#FFB800',
  garbage: '#00D68F', sewage: '#9B59FF', streetlight: '#FFE066', other: '#8B9BB8'
};

const STATUS_STYLE = {
  reported:    { bg: 'rgba(139,155,184,0.12)', fg: '#8B9BB8',  label: 'Reported'  },
  verified:    { bg: 'rgba(79,142,255,0.12)',   fg: '#4F8EFF',  label: 'Verified'  },
  assigned:    { bg: 'rgba(255,184,0,0.12)',    fg: '#FFB800',  label: 'Assigned'  },
  in_progress: { bg: 'rgba(155,89,255,0.12)',   fg: '#9B59FF',  label: 'In Progress'},
  resolved:    { bg: 'rgba(0,214,143,0.12)',    fg: '#00D68F',  label: 'Resolved'  },
  rejected:    { bg: 'rgba(255,92,107,0.12)',   fg: '#FF5C6B',  label: 'Rejected'  }
};

const listVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 24 } }
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function decodeUserId(token) {
  try { return JSON.parse(atob(token.split('.')[1])).id; }
  catch { return null; }
}

export default function Home({ token, onNavigateReport }) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const currentUserId = decodeUserId(token);
  const showToast = useToast();

  useEffect(() => {
    fetchFeed(token)
      .then(setFeed)
      .catch(() => setFeed([]))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleVote(reportId) {
    setVotingId(reportId);
    try {
      const result = await voteReport(token, reportId);
      setFeed(prev => prev.map(r =>
        r.id === reportId ? { ...r, vote_count: result.vote_count, has_voted: result.voted ? 1 : 0 } : r
      ));
    } catch (err) {
      showToast(err.message, 'error');
    } finally { setVotingId(null); }
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,58,237,0.35)'
          }}>
            <span className="material-symbols-outlined" style={{ color: '#FFFFFF', fontSize: 18 }}>neurology</span>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 0 }}>Vexa AI</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Community Feed</div>
          </div>
        </motion.div>
        <NotificationBell token={token} />
      </div>

      {/* Hero text */}
      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 120 }}
        style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10 }}
      >
        See it.{' '}
        <span style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Report it.
        </span>{' '}
        Track it.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="page-sub"
      >
        Every report is auto-classified and prioritized by Vexa AI — no complaint gets lost.
      </motion.p>

      {/* Stats banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1, marginBottom: 24, borderRadius: 16, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)'
        }}
      >
        {[
          { label: 'Reports Today', value: feed.length, icon: 'description' },
          { label: 'Resolved', value: feed.filter(r => r.status === 'resolved').length, icon: 'check_circle' },
          { label: 'In Progress', value: feed.filter(r => r.status === 'in_progress').length, icon: 'pending' }
        ].map((s, i) => (
          <div key={i} style={{ padding: '14px 16px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--brand-teal)', display: 'block', marginBottom: 4 }}>
              {s.icon}
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
          </div>
        ))}
      </motion.div>

      <DisplayCards />

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="btn-primary"
        style={{ marginBottom: 32, borderRadius: 14 }}
        onClick={onNavigateReport}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
        Report an Issue
      </motion.button>

      {/* Feed header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="label-caps">Community Reports</span>
          {!loading && feed.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: 'rgba(124,58,237,0.12)', color: 'var(--brand-teal)',
              fontFamily: "'JetBrains Mono', monospace"
            }}>{feed.length}</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>LIVE</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FeedCardSkeleton /><FeedCardSkeleton /><FeedCardSkeleton />
        </div>
      ) : feed.length === 0 ? (
        <div className="card empty-state">
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--text-muted)' }}>inbox</span>
          <div>No reports yet — be the first to report an issue in your area.</div>
        </div>
      ) : (
        <motion.div variants={listVariants} initial="hidden" animate="show"
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {feed.map((r) => {
            const statusStyle = STATUS_STYLE[r.status] || STATUS_STYLE.reported;
            const catColor = CATEGORY_COLOR[r.category] || '#8B9BB8';
            const isExpanded = expandedId === r.id;
            return (
              <motion.div key={r.id} variants={cardVariants} layout="position"
                className="card interactive"
                style={{ padding: '16px 18px', cursor: 'default' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Icon */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: `${catColor}18`,
                    border: `1px solid ${catColor}28`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span className="material-symbols-outlined" style={{ color: catColor, fontSize: 20 }}>
                      {CATEGORY_ICON[r.category] || 'report'}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{
                        fontWeight: 700, fontSize: 14, textTransform: 'capitalize',
                        color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif"
                      }}>
                        {r.category} report
                      </span>
                      <span style={{
                        fontSize: 10, color: 'var(--text-muted)',
                        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em'
                      }}>
                        #{String(r.id).padStart(4, '0')}
                      </span>
                    </div>

                    {/* Time */}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                      {timeAgo(r.created_at)}
                    </div>

                    {/* Badges row */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Status badge */}
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                        background: statusStyle.bg, color: statusStyle.fg,
                        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.03em'
                      }}>
                        {statusStyle.label}
                      </span>

                      {/* Urgency */}
                      <span className={`tag urgency-${r.urgency_score}`} style={{ borderRadius: 999 }}>
                        {r.urgency_score}
                      </span>

                      {/* Vote button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleVote(r.id)}
                        disabled={votingId === r.id}
                        style={{
                          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 12px', borderRadius: 999,
                          border: r.has_voted ? '1px solid var(--brand-teal)' : '1px solid rgba(255,255,255,0.1)',
                          background: r.has_voted ? 'rgba(0,229,204,0.12)' : 'transparent',
                          color: r.has_voted ? 'var(--brand-teal)' : 'var(--text-muted)',
                          cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          transition: 'all 0.2s ease', fontFamily: "'JetBrains Mono', monospace"
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                          {r.has_voted ? 'thumb_up' : 'thumb_up_off_alt'}
                        </span>
                        {r.vote_count || 0}
                      </motion.button>
                    </div>

                    {/* Expand button */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        fontSize: 12, cursor: 'pointer', padding: 0, marginTop: 12,
                        display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.2s'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        {isExpanded ? 'expand_less' : 'chat_bubble_outline'}
                      </span>
                      {isExpanded ? 'Hide discussion' : 'View discussion'}
                    </button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <CommentSection token={token} reportId={r.id} currentUserId={currentUserId} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <div style={{ marginTop: 36 }}>
        <HowItWorks />
      </div>
    </div>
  );
}