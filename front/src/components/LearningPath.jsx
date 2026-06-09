import { useEffect, useRef } from 'react';

const styles = {
  container: {
    margin: '12px 0',
    padding: '16px 0',
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    color: '#214559',
    marginBottom: 16,
    paddingLeft: 16,
  },
  scroll: {
    display: 'flex',
    gap: 24,
    padding: '0 16px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  nodeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 56,
    flexShrink: 0,
  },
  node: (color, isCurrent) => ({
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 8px rgba(152,202,225,0.3)',
    cursor: 'pointer',
    position: 'relative',
    animation: isCurrent ? 'pulse 1.2s ease-in-out infinite' : 'none',
    transition: 'background 0.3s',
  }),
  nodeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 800,
  },
  nodeCurrent: {
    color: '#fff',
    fontSize: 18,
  },
  nodeIndex: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
  },
  nodeLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: 600,
    color: '#214559',
    textAlign: 'center',
    maxWidth: 66,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  nodeLabelFuture: {
    color: '#94a3b8',
  },
  line: (color) => ({
    position: 'absolute',
    top: 28,
    left: 56,
    width: 24,
    height: 4,
    background: color,
    borderRadius: 2,
    zIndex: -1,
  }),
  empty: {
    padding: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 600,
  },
};

function PathNode({ gesture, index, isCompleted, isCurrent, isLocked, onPress }) {
  const label = gesture?.name || gesture?.label || '';
  const nodeColor = isCompleted ? '#3c95bb' : isCurrent ? '#3c95bb' : '#cbd5e1';
  const lineColor = isCompleted ? '#3c95bb' : '#cbd5e1';

  return (
    <div style={styles.nodeContainer}>
      <div
        onClick={() => !isLocked && onPress?.()}
        style={styles.node(nodeColor, isCurrent)}
      >
        {index < 10 && <div style={styles.line(lineColor)} />}
        {isCompleted ? (
          <div style={styles.nodeText}>✓</div>
        ) : isCurrent ? (
          <div style={styles.nodeCurrent}>●</div>
        ) : isLocked ? (
          <span role="img" aria-label="locked" style={{ fontSize: 18 }}>🔒</span>
        ) : (
          <div style={styles.nodeIndex}>{index + 1}</div>
        )}
      </div>
      <div style={{ ...styles.nodeLabel, ...(isLocked && !isCompleted && !isCurrent ? styles.nodeLabelFuture : {}) }}>
        {label}
      </div>
    </div>
  );
}

export default function LearningPath({ gestures = [], completedIds = [], currentId, onSelectGesture }) {
  const scrollRef = useRef(null);
  const currentIndex = gestures.findIndex(g => g.id === currentId);

  useEffect(() => {
    if (currentIndex >= 0 && scrollRef.current) {
      const scrollEl = scrollRef.current;
      setTimeout(() => {
        scrollEl.scrollTo({ left: Math.max(0, currentIndex * (56 + 24) - 100), behavior: 'smooth' });
      }, 500);
    }
  }, [currentIndex]);

  if (!gestures || gestures.length === 0) {
    return <div style={styles.empty}>Путь обучения пуст</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Путь обучения</div>
      <div ref={scrollRef} style={styles.scroll}>
        {gestures.slice(0, 12).map((g, idx) => {
          const isCompleted = completedIds.includes(g.id);
          const isCurrent = g.id === currentId;
          const isLocked = !isCompleted && !isCurrent && idx > currentIndex + 1;
          return (
            <PathNode
              key={g.id}
              gesture={g}
              index={idx}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              isLocked={isLocked}
              onPress={() => !isLocked && onSelectGesture?.(g)}
            />
          );
        })}
      </div>
    </div>
  );
}
