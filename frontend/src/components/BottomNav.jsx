import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { key: 'home', icon: 'dashboard', label: 'Feed' },
  { key: 'map', icon: 'map', label: 'Map' },
  { key: 'report', icon: 'gavel', label: 'Report' },
  { key: 'profile', icon: 'person', label: 'Profile' }
];

const ITEM_SIZE = 46;
const MAGNIFY_RANGE = 90; // px — how far the cursor's "pull" reaches
const MAGNIFY_SCALE = 1.35;

// macOS dock-style icon: scales up as the cursor approaches, based on
// live distance from mouseX (a shared motion value from the parent).
function DockIcon({ item, isActive, mouseX, onClick }) {
  const ref = useRef(null);

  const distance = useTransform(mouseX, (val) => {
    if (val === null || !ref.current) return MAGNIFY_RANGE;
    const rect = ref.current.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    return Math.abs(val - center);
  });

  const rawScale = useTransform(distance, [0, MAGNIFY_RANGE], [MAGNIFY_SCALE, 1]);
  const scale = useSpring(rawScale, { stiffness: 300, damping: 20 });

  const [ripples, setRipples] = useState([]);

  function handleClick(e) {
    const rect = ref.current.getBoundingClientRect();
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
    onClick();
  }

  return (
    <motion.button
      ref={ref}
      onClick={handleClick}
      aria-label={item.label}
      style={{
        position: 'relative', width: ITEM_SIZE, height: ITEM_SIZE, border: 'none',
        background: 'transparent', cursor: 'pointer', overflow: 'visible',
        display: 'flex', alignItems: 'center', justifyContent: 'center', scale
      }}
      whileTap={{ scale: 0.85 }}
    >
      {/* Tap ripple burst */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute', left: r.x, top: r.y, width: 10, height: 10,
              borderRadius: '50%', background: 'var(--secondary-container)',
              translateX: '-50%', translateY: '-50%', pointerEvents: 'none'
            }}
          />
        ))}
      </AnimatePresence>

      {/* Goo blob */}
      {isActive && (
        <motion.div
          layoutId="magic-nav-blob"
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          style={{
            position: 'absolute', top: -14, width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
            boxShadow: '0 0 20px rgba(124,58,237,0.45)'
          }}
        />
      )}

      {/* Sonar pulse rings */}
      {isActive && [0, 0.5, 1].map((delay) => (
        <motion.span
          key={delay}
          initial={{ scale: 0.8, opacity: 0.4 }}
          animate={{ scale: 2.1, opacity: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, delay, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: -14, width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: '50%',
            border: '2px solid rgba(124,58,237,0.4)', pointerEvents: 'none'
          }}
        />
      ))}

      <motion.span
        className="material-symbols-outlined"
        animate={{
          y: isActive ? -14 : 0,
          color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.35)'
        }}
        whileHover={!isActive ? { color: 'var(--brand-teal)' } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        style={{ fontSize: 22, position: 'relative', zIndex: 2 }}
      >
        {item.icon}
      </motion.span>
    </motion.button>
  );
}

export default function BottomNav({ active, onChange }) {
  const mouseX = useMotionValue(null);

  return (
    <nav
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(null)}
      style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 2,
        background: 'rgba(13,20,32,0.9)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9999,
        padding: '10px 16px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.10), inset 0 1px 0 rgba(255,255,255,0.05)',
        zIndex: 40
      }}
    >
      {NAV_ITEMS.map((item) => (
        <DockIcon
          key={item.key}
          item={item}
          isActive={active === item.key}
          mouseX={mouseX}
          onClick={() => onChange(item.key)}
        />
      ))}
    </nav>
  );
}