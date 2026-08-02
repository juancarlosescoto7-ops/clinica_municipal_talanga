import styles from "./keyboard-hints.module.css";

export interface KeyboardHint {
  keys: string;
  label: string;
}

interface KeyboardHintsProps {
  hints: readonly KeyboardHint[];
}

export function KeyboardHints({ hints }: KeyboardHintsProps) {
  return (
    <aside
      aria-label="Atajos de teclado disponibles"
      className={styles.hints}
    >
      <strong>Teclado</strong>
      <div>
        {hints.map((hint) => (
          <span key={`${hint.keys}-${hint.label}`}>
            <kbd>{hint.keys}</kbd>
            {hint.label}
          </span>
        ))}
      </div>
    </aside>
  );
}
