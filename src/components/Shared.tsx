import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Category } from "../types";
import { categoryName } from "../utils/presentation";

export function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark${small ? " small" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="1" y="1" width="22" height="22" rx="5" fill="#0A3323" />
        <path d="M8 5h8v14l-4-3-4 3V5Z" fill="#F7F4D5" />
      </svg>
    </span>
  );
}
export function Monogram({ domain }: { domain: string }) {
  const letter =
    domain
      .replace(/^www\./, "")
      .charAt(0)
      .toUpperCase() || "·";
  return (
    <span
      aria-hidden="true"
      className={`monogram tone-${letter.charCodeAt(0) % 5}`}
    >
      {letter}
    </span>
  );
}
export function CategorySelect({
  categories,
  value,
  onChange,
  label = "Klasör",
  disabled = false,
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
    >
      <option value="">Klasörsüz</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.icon ? c.icon + " " : ""}
          {categoryName(c)}
        </option>
      ))}
    </select>
  );
}
export const ActionErrorContext = createContext("");
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const error = useContext(ActionErrorContext);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Pencereyi kapat"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <Mark />
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
export function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("tr-TR", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date().getFullYear()
      ? { year: "numeric" }
      : {}),
  });
}
