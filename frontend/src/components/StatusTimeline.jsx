const STAGES = ['reported', 'verified', 'assigned', 'in_progress', 'resolved'];

// Renders the report's journey as a connected thread — each dot lit up to the
// current stage, dashed line representing the "paper trail made visible."
export default function StatusTimeline({ currentStatus }) {
  const currentIndex = STAGES.indexOf(currentStatus);

  return (
    <div className="timeline">
      <div className="timeline-path" />
      {STAGES.map((stage, i) => {
        const isPending = i > currentIndex;
        return (
          <div key={stage} className={`timeline-step ${isPending ? 'pending' : ''}`}>
            <div className="timeline-dot" />
            <div className="timeline-label">{stage.replace('_', ' ')}</div>
          </div>
        );
      })}
    </div>
  );
}