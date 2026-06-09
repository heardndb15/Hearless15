import { useState, useEffect } from 'react';

const styles = {
  container: {
    background: 'linear-gradient(135deg, #3c95bb, #2c789d)',
    borderRadius: '28px',
    padding: '28px 20px',
    margin: '12px 0 20px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  circleWrap: {
    position: 'relative',
    width: 140,
    height: 140,
    margin: '0 auto 16px',
  },
  circleBg: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
  },
  circleInner: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 120,
    height: 120,
    borderRadius: '50%',
    background: '#2c789d',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleRing: (progress) => ({
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '10px solid transparent',
    borderTopColor: '#f3f8fc',
    borderRightColor: '#f3f8fc',
    transform: `rotate(${-90 + 360 * progress}deg)`,
    transition: 'transform 1.2s ease',
    zIndex: 1,
  }),
  circleNum: {
    fontSize: 42,
    fontWeight: 900,
    color: '#f3f8fc',
    lineHeight: 1,
    letterSpacing: -1,
  },
  circleLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: 'rgba(243,248,252,0.8)',
  },
  streak: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
    fontSize: 18,
    fontWeight: 700,
    color: '#f3f8fc',
  },
  metrics: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: '14px 8px',
  },
  metric: {
    flex: 1,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 28,
    background: 'rgba(255,255,255,0.2)',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 800,
    color: '#f3f8fc',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(243,248,252,0.7)',
    marginTop: 2,
  },
};

export default function ProgressHero({ stats, streak }) {
  const learned = stats?.learned || 0;
  const total = stats?.total || 78;
  const practiced = stats?.practiced || 0;
  const accuracy = stats?.accuracy ?? 0;
  const progress = total > 0 ? learned / total : 0;
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div style={styles.container}>
      <div style={styles.circleWrap}>
        <div style={styles.circleBg} />
        <div style={styles.circleRing(animProgress)} />
        <div style={styles.circleInner}>
          <div style={styles.circleNum}>{learned}</div>
          <div style={styles.circleLabel}>из {total}</div>
        </div>
      </div>
      {streak > 0 && (
        <div style={styles.streak}>
          <span role="img" aria-label="fire">🔥</span> {streak} дней подряд
        </div>
      )}
      <div style={styles.metrics}>
        <div style={styles.metric}>
          <div style={styles.metricValue}>{learned}</div>
          <div style={styles.metricLabel}>Изучено</div>
        </div>
        <div style={styles.divider} />
        <div style={styles.metric}>
          <div style={styles.metricValue}>{practiced}</div>
          <div style={styles.metricLabel}>Практик</div>
        </div>
        <div style={styles.divider} />
        <div style={styles.metric}>
          <div style={styles.metricValue}>{accuracy}%</div>
          <div style={styles.metricLabel}>Точность</div>
        </div>
      </div>
    </div>
  );
}
