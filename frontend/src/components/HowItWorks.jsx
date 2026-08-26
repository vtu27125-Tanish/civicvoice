import { motion } from 'framer-motion';
import { Timeline, TimelineChild } from './ui/timeline';

function Step({ icon, text }) {
  return (
    <TimelineChild>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <motion.span
          className="material-symbols-outlined"
          style={{ fontSize: 18, color: 'var(--primary-container)' }}
          initial={{ scale: 0, rotate: -45 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: false, amount: 0.6 }}
          transition={{ type: 'spring', stiffness: 260, damping: 12 }}
        >
          {icon}
        </motion.span>
        <p style={{ fontSize: 13, color: 'var(--on-surface)', margin: 0 }}>{text}</p>
      </div>
    </TimelineChild>
  );
}

export default function HowItWorks() {
  const data = [
    {
      title: '1. Report',
      content: (
        <div>
          <Step icon="mic" text="Speak or type the issue — in your own language" />
          <Step icon="my_location" text="Location auto-detected from your device" />
          <Step icon="add_a_photo" text="Optional photo, quality-checked instantly" />
        </div>
      )
    },
    {
      title: '2. AI Classifies',
      content: (
        <div>
          <Step icon="psychology" text="Trained classifier sorts it into a category in real time" />
          <Step icon="warning" text="Urgency scored — sentiment analysis catches distress even without keywords" />
          <Step icon="link" text="Checked against nearby reports to avoid duplicates" />
        </div>
      )
    },
    {
      title: '3. Routed',
      content: (
        <div>
          <Step icon="alt_route" text="Auto-assigned to the right department" />
          <Step icon="location_on" text="Added to the hotspot map if it's part of a pattern" />
          <Step icon="how_to_vote" text="Neighbors can upvote to confirm it's a real, shared issue" />
        </div>
      )
    },
    {
      title: '4. Resolved',
      content: (
        <div>
          <Step icon="task_alt" text="Officials track it on a live dashboard, sorted by priority" />
          <Step icon="mail" text="You get notified the moment status changes" />
          <Step icon="check_circle" text="Closed out — visible in the public feed for full transparency" />
        </div>
      )
    }
  ];

  return (
    <div style={{ marginBottom: 8 }}>
      <div className="label-caps" style={{ marginBottom: 12 }}>How Vexa AI works</div>
      <Timeline data={data} />
    </div>
  );
}