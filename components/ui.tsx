"use client";
import { useState, type ReactNode } from "react";

/* ── Modal ── */
export function Modal({
  open,
  onClose,
  title,
  children,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ── Stage Bar ── */
export function StageBar<T extends string>({
  stages,
  current,
  onChange,
}: {
  stages: readonly T[];
  current: T;
  onChange?: (stage: T) => void;
}) {
  const idx = stages.indexOf(current);
  return (
    <div className="stage-bar">
      {stages.map((s, i) => (
        <button
          key={s}
          className={`stage-step ${i < idx ? "done" : ""} ${i === idx ? "active" : ""}`}
          onClick={() => onChange?.(s)}
          type="button"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/* ── Tabs ── */
export function TabGroup({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`tab-btn ${active === t.id ? "active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ── Confirm Dialog ── */
export function useConfirm() {
  const [state, setState] = useState<{
    message: string;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ message, resolve });
    });
  };

  const ConfirmDialog = () => {
    if (!state) return null;
    return (
      <div className="modal-overlay" onClick={() => { state.resolve(false); setState(null); }}>
        <div className="modal-box" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-body" style={{ textAlign: "center", padding: "24px 20px" }}>
            <p style={{ fontSize: 16, margin: "0 0 20px" }}>{state.message}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="btn ghost"
                onClick={() => { state.resolve(false); setState(null); }}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: "var(--bad)" }}
                onClick={() => { state.resolve(true); setState(null); }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return { confirm, ConfirmDialog };
}

/* ── Field Row ── */
export function FieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field-row">
      <label className="field-label">{label}</label>
      <div className="field-value">{children}</div>
    </div>
  );
}

