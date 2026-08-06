import { motion } from 'framer-motion';

function shimmerStyle(width, height, radius = 6) {
  return {
    width,
    height,
    borderRadius: radius,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%'
  };
}

function Shimmer({ width, height, radius }) {
  return (
    <motion.div
      style={shimmerStyle(width, height, radius)}
      animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
    />
  );
}

export function FeedCardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', gap: 14, padding: 16 }}>
      <Shimmer width={40} height={40} radius={10} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Shimmer width="60%" height={14} />
        <Shimmer width="30%" height={11} />
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <Shimmer width={60} height={18} radius={4} />
          <Shimmer width={50} height={18} radius={4} />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Shimmer width="50%" height={11} />
      <Shimmer width="40%" height={30} />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr>
      <td colSpan={5} style={{ padding: '12px' }}>
        <Shimmer width="100%" height={16} />
      </td>
    </tr>
  );
}