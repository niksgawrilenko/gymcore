'use client';
import { useEffect, type ReactNode } from 'react';

let openModals = 0;

/** Нижняя «шторка» в iOS-стиле (классы .modal-overlay / .modal-content из globals.css). */
export function Modal({
  open,
  onClose,
  children,
  className = '',
  zIndex,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  zIndex?: number;
}) {
  useEffect(() => {
    if (!open) return;
    openModals++;
    document.body.classList.add('modal-open');
    return () => {
      openModals--;
      if (openModals === 0) document.body.classList.remove('modal-open');
    };
  }, [open]);

  return (
    <div
      className={`modal-overlay${open ? ' active' : ''}`}
      style={zIndex ? { zIndex } : undefined}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal-content ${className}`}>{children}</div>
    </div>
  );
}

export function ModalHeader({ title, onClose, children }: { title: ReactNode; onClose: () => void; children?: ReactNode }) {
  return (
    <div className="modal-header">
      <h3>{title}</h3>
      <div className="row" style={{ gap: 15 }}>
        {children}
        <button type="button" className="close-btn" style={{ fontSize: 20, lineHeight: 1 }} onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
}
