import { useState } from 'react';

const styles = {
  wrapper: {
    margin: '8px 0',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  scroll: {
    display: 'flex',
    gap: 10,
    padding: '0 16px',
  },
  pill: (active) => ({
    padding: '10px 20px',
    borderRadius: '50px',
    border: 'none',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: active ? '#2c789d' : '#cce4f0',
    color: active ? '#ffffff' : '#214559',
    transition: 'all 0.2s',
    transform: active ? 'scale(1)' : 'scale(1)',
  }),
};

const DEFAULT_CATEGORIES = [
  { key: 'all', label: 'Все' },
  { key: 'alphabet', label: 'Алфавит' },
  { key: 'numbers', label: 'Цифры' },
  { key: 'greetings', label: 'Приветствия' },
  { key: 'emergency', label: 'Экстренные' },
  { key: 'common', label: 'Общие' },
  { key: 'colors', label: 'Цвета' },
];

export default function CategoryFilter({ categories = DEFAULT_CATEGORIES, activeCategory = 'all', onSelect }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.scroll}>
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            style={styles.pill(cat.key === activeCategory)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
