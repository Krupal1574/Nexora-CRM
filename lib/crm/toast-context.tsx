"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ToastContextType {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    setTimeout(() => setVisible(false), 2200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className={`toast ${visible ? "show" : ""}`} role="status">{message}</div>
    </ToastContext.Provider>
  );
}

export function SoonButton({ label, className = "btn" }: { label: string; className?: string }) {
  const { show } = useToast();
  return (
    <button className={className} onClick={() => show(`${label} is coming soon — visual preview only.`)}>
      {label} <span className="pill soon">Soon</span>
    </button>
  );
}
