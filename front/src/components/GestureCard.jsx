export default function GestureCard({ gesture, status = 'new', isLocked = false, onPress, style }) {
  const category = gesture.category || gesture.topic || 'common';
  const name = gesture.label || gesture.name || '';
  const sub = gesture.sub || '';
  const isLearned = status === 'learned';
  const hand = gesture.hand;

  return (
    <div
      onClick={() => { if (!isLocked && onPress) onPress(); }}
      style={{
        background: '#fff',
        borderRadius: '28px',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        border: isLearned ? '1px solid #86efac' : '1px solid #e2e8f0',
        cursor: isLocked ? 'default' : 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isLearned ? '0 4px 20px rgba(34, 197, 94, 0.1)' : '0 10px 40px rgba(0,0,0,0.03)',
        position: 'relative',
        overflow: 'hidden',
        ...(isLocked ? { opacity: 0.5 } : {}),
        ...style,
      }}
    >
      {isLearned && (
        <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#22c55e', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '50px' }}>
          ✓
        </div>
      )}
      {isLocked && (
        <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#162d3b', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '50px' }}>
          🔒
        </div>
      )}
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80px' }}>
        {hand ? (
          <HandVisual fingers={hand} size={72} />
        ) : (
          <span style={{ fontSize: '4rem' }}>{gesture.icon}</span>
        )}
      </div>
      <h3 style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.25rem', marginBottom: '0.5rem', margin: 0 }}>{name}</h3>
      {sub && (
        <span style={{ color: '#3b82f6', background: '#eff6ff', padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block' }}>
          {sub}
        </span>
      )}
      <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
        <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: isLearned ? '100%' : status === 'in_progress' ? '50%' : '0%',
            background: isLearned ? '#22c55e' : '#3b82f6',
            borderRadius: 3,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

function HandVisual({ fingers, size = 72 }) {
  const segments = fingers || [0, 0, 0, 0, 0];
  const labels = ['thumb', 'index', 'middle', 'ring', 'pinky'];
  const segmentStyles = {
    0: { h: 0, v: 0 },        // hidden / fist
    1: { h: size * 0.3, v: 0 },  // straight
    2: { h: size * 0.2, v: -size * 0.15 },  // sideways
    3: { h: size * 0.15, v: -size * 0.05 }, // bent / touching
    4: { h: size * 0.1, v: -size * 0.1 },   // crossed
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: Math.round(size * 0.12), alignItems: 'flex-end', height: size }}>
      {segments.map((s, i) => {
        const st = segmentStyles[s] || segmentStyles[0];
        return (
          <div
            key={labels[i]}
            style={{
              width: Math.round(size * 0.16),
              height: Math.round(size * 0.65),
              background: s === 0 ? '#e2e8f0' : '#3b82f6',
              borderRadius: '6px 6px 2px 2px',
              transform: `translateX(${st.h}px) translateY(${st.v}px)`,
              transition: 'all 0.3s',
              opacity: s === 0 ? 0.4 : 1,
            }}
          />
        );
      })}
    </div>
  );
}
