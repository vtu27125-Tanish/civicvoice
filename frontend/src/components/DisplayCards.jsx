import { motion } from 'framer-motion';

const DEFAULT_CARDS = [
  {
    icon: 'psychology',
    title: 'AI-classified',
    description: 'Every report auto-sorted by category and urgency',
    date: 'Instant',
    offset: 0
  },
  {
    icon: 'link',
    title: 'Duplicate-linked',
    description: "Same issue nearby? We merge it, your voice adds weight",
    date: 'On submit',
    offset: 1
  },
  {
    icon: 'location_on',
    title: 'Hotspot-tracked',
    description: 'Recurring problem areas surface automatically for officials',
    date: 'Always on',
    offset: 2
  }
];

export default function DisplayCards({ cards = DEFAULT_CARDS }) {
  return (
    <div style={{
      display: 'grid',
      placeItems: 'center',
      padding: '32px 0 56px',
      minHeight: 200
    }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 160 }}>
        {cards.map((card, i) => (
          <motion.div
            key={i}
            className="display-card"
            style={{
              position: 'absolute',
              top: card.offset * 22,
              left: card.offset * 26,
              zIndex: cards.length - card.offset,
              cursor: 'pointer'
            }}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: card.offset * 22 }}
            whileHover={{
              scale: 1.05,
              y: card.offset * 22 - 14,
              zIndex: 50,
              boxShadow: '0px 20px 40px rgba(0, 52, 52, 0.16)'
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--primary-container)', color: 'white'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{card.icon}</span>
              </span>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{card.title}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--on-surface)', margin: '8px 0 0' }}>{card.description}</p>
            <p className="mono" style={{ fontSize: 11, color: 'var(--on-surface-variant)', margin: '6px 0 0' }}>{card.date}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
