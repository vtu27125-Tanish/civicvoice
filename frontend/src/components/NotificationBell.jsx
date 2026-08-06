import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../api";

const TYPE_ICON = {
  status_change: "update",
  new_comment:   "chat_bubble",
  duplicate_linked: "link"
};

const TYPE_COLOR = {
  status_change:    "#00E5CC",
  new_comment:      "#4F8EFF",
  duplicate_linked: "#9B59FF"
};

const ringVariants = {
  idle: { rotate: 0 },
  ring: {
    rotate: [0, -14, 12, -10, 8, -4, 0],
    transition: { duration: 0.7, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.5 }
  }
};

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } }
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 220, damping: 20 } },
  exit: { opacity: 0, x: 12, height: 0, transition: { duration: 0.18 } }
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell({ token }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [justArrived, setJustArrived] = useState(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  const unread = notifications.filter(n => !n.is_read).length;

  async function load() {
    try {
      const data = await fetchNotifications(token);
      if (data.length > 0 && notifications.length > 0 && data[0].id !== notifications[0]?.id) {
        setJustArrived(data[0].id);
        setTimeout(() => setJustArrived(null), 1500);
      }
      setNotifications(data);
    } catch { /* non-critical */ }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e) {
      if (open && panelRef.current && !panelRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function markAll() {
    await markAllNotificationsRead(token);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function markOne(id) {
    await markNotificationRead(token, id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <motion.button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-label="Open notifications"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        style={{
          position: 'relative',
          width: 40, height: 40,
          borderRadius: 12,
          background: open ? 'rgba(0,229,204,0.1)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(0,229,204,0.3)' : 'rgba(255,255,255,0.09)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background 0.2s, border-color 0.2s',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Animated bell icon */}
        <motion.span
          className="material-symbols-outlined"
          variants={ringVariants}
          animate={unread > 0 && !open ? "ring" : "idle"}
          style={{
            fontSize: 18,
            color: open ? 'var(--brand-teal)' : 'var(--text-secondary)',
            display: 'block',
            transition: 'color 0.2s'
          }}
        >
          {unread > 0 ? 'notifications_active' : 'notifications'}
        </motion.span>

        {/* Unread badge */}
        <AnimatePresence>
          {unread > 0 && (
            <motion.div
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              style={{
                position: 'absolute', top: -6, right: -6,
                minWidth: 18, height: 18, borderRadius: 999,
                background: 'linear-gradient(135deg, #FF5C6B, #FF8C42)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 5px',
                boxShadow: '0 0 8px rgba(255,92,107,0.5)',
                fontSize: 10, fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                color: 'white', border: '2px solid var(--bg)'
              }}
            >
              {unread > 99 ? '99+' : unread}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{
              position: 'absolute', top: 48, right: 0, zIndex: 200,
              width: 320,
              background: 'rgba(13,20,32,0.95)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,204,0.06)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--brand-teal)' }}>
                  notifications
                </span>
                <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>
                  Notifications
                </span>
                {unread > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                    background: 'rgba(0,229,204,0.12)', color: 'var(--brand-teal)',
                    fontFamily: "'JetBrains Mono', monospace", border: '1px solid rgba(0,229,204,0.2)'
                  }}>{unread}</span>
                )}
              </div>
              {unread > 0 && (
                <button onClick={markAll} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif",
                  transition: 'color 0.2s', padding: 0
                }}
                  onMouseEnter={e => e.target.style.color = 'var(--brand-teal)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.4 }}>notifications_none</span>
                  No notifications yet
                </div>
              ) : (
                <motion.div variants={listVariants} initial="hidden" animate="visible">
                  <AnimatePresence initial={false}>
                    {notifications.map(n => {
                      const color = TYPE_COLOR[n.type] || '#8B9BB8';
                      return (
                        <motion.div
                          key={n.id}
                          variants={rowVariants}
                          exit="exit"
                          layout
                          animate={{
                            backgroundColor: justArrived === n.id
                              ? ['rgba(0,229,204,0.12)', 'rgba(0,0,0,0)']
                              : 'rgba(0,0,0,0)'
                          }}
                          transition={justArrived === n.id ? { duration: 1.4 } : undefined}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            cursor: 'pointer',
                            background: !n.is_read ? 'rgba(0,229,204,0.03)' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                          onClick={() => markOne(n.id)}
                          whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            {/* Type icon */}
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: `${color}18`, border: `1px solid ${color}28`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 15, color }}>
                                {TYPE_ICON[n.type] || 'notifications'}
                              </span>
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 13, color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                                lineHeight: 1.4, marginBottom: 4, fontWeight: n.is_read ? 400 : 500
                              }}>
                                {n.message}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                                {timeAgo(n.created_at)}
                              </div>
                            </div>

                            {/* Unread dot */}
                            {!n.is_read && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                                style={{
                                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                                  background: 'var(--brand-teal)',
                                  boxShadow: '0 0 6px rgba(0,229,204,0.6)'
                                }}
                              />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}