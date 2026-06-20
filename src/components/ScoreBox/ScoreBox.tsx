import styles from './ScoreBox.module.css';

interface ScoreBoxProps {
  label: string;
  value: number;
  variant?: 'current' | 'best';
}

export default function ScoreBox({ label, value, variant = 'current' }: ScoreBoxProps) {
  const className = `${styles.scoreBox} ${variant === 'best' ? styles.best : styles.current}`;

  return (
    <div className={className} aria-live={variant === 'current' ? 'polite' : undefined}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
