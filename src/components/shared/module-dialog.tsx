"use client";

import {
  useEffect,
  useId,
  type MouseEvent,
  type ReactNode,
} from "react";

import styles from "./module-dialog.module.css";

interface ModuleDialogProps {
  children: ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}

export function ModuleDialog({
  children,
  onClose,
  title,
  wide = false,
}: ModuleDialogProps) {
  const titleId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={`${styles.dialog}${wide ? ` ${styles.wide}` : ""}`}
        role="dialog"
      >
        <header className={styles.header}>
          <div>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            aria-label="Cerrar"
            className={styles.closeButton}
            onClick={onClose}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </section>
    </div>
  );
}
