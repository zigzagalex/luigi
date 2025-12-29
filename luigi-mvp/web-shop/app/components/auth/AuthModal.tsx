"use client";

import { useEffect, useRef } from "react";
import styles from "./AuthModal.module.css";
import { AuthBox } from "./AuthBox"; // your login/signup component

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AuthModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal(); // top-layer modal + backdrop + focus mgmt
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      // Esc triggers "cancel" by default. Keep it consistent.
      e.preventDefault();
      onClose();
    };

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  function onBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    // Clicking the backdrop hits the dialog element itself.
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <dialog
    ref={dialogRef}
    className={styles.dialog}
    onClick={onBackdropClick}
    aria-labelledby="auth-title"
    >
      <div className={styles.panel} role="document">
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.title}>Welcome back</h2>
            <p className={styles.subtitle}>Log in or create an account.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <AuthBox />
      </div>
    </dialog>
  );
}
