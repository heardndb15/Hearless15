function getProgressWidth(status) {
  switch (status) {
    case 'learned': return '100%';
    case 'in_progress': return '50%';
    default: return '0%';
  }
}

function getProgressColor(status) {
  switch (status) {
    case 'learned': return '#22c55e';
    case 'in_progress': return '#3c95bb';
    default: return '#e2e8f0';
  }
}

const HAND_ICONS = {
  alphabet: '🖐️',
  numbers: '🔢',
  greetings: '👋',
  emergency: '🆘',
  common: '🤟',
  colors: '🎨',
  default: '✋',
};

function getHandIcon(category) {
  return HAND_ICONS[category] || HAND_ICONS.default;
}

const styles = {
  card: {
    background: '#ffffff',
    borderRadius: '22px',
    padding: '14px',
    boxShadow: '0 6px 14px rgba(152, 202, 225, 0.25)',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  cardLocked: {
    opacity: 0.65,
  },
  illustration: {
    background: '#e6f1f8',
    borderRadius: '18px',
    height: 90,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    fontSize: 44,
  },
  name: {
    fontSize: 18,
    fontWeight: 800,
    color: '#214559',
    marginBottom: 4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  categoryTag: {
    display: 'inline-block',
    background: '#cce4f0',
    padding: '3px 10px',
    borderRadius: '10px',
    fontSize: 11,
    fontWeight: 700,
    color: '#2c789d',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  progressTrack: {
    height: 5,
    background: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: (status) => ({
    height: '100%',
    width: getProgressWidth(status),
    background: getProgressColor(status),
    borderRadius: 3,
    transition: 'width 0.5s ease',
  }),
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: '#22c55e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    boxShadow: '0 2px 6px rgba(34,197,94,0.4)',
    zIndex: 2,
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: '#162d3b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    fontSize: 16,
  },
};

export default function GestureCard({ gesture, status = 'new', isLocked = false, onPress, style }) {
  const category = gesture.category || gesture.topic || 'common';
  const name = gesture.label || gesture.name || '';
  const sub = gesture.sub || '';

  const handleClick = (e) => {
    if (!isLocked && onPress) onPress(e);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        ...styles.card,
        ...(isLocked ? styles.cardLocked : {}),
        ...style,
        animation: 'fadeUp 0.5s ease forwards',
        opacity: 0,
      }}
    >
      {isLocked && (
        <div style={styles.lockBadge}>
          <span role="img" aria-label="locked">🔒</span>
        </div>
      )}
      {status === 'learned' && (
        <div style={styles.checkBadge}>✓</div>
      )}
      <div style={styles.illustration}>{getHandIcon(category)}</div>
      <div style={styles.name}>{name}</div>
      {sub && <div style={styles.categoryTag}>{sub}</div>}
      <div style={styles.progressTrack}>
        <div style={styles.progressFill(status)} />
      </div>
    </div>
  );
}
