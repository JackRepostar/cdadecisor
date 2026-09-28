import type { ReactNode } from "react";

export function Pill({
  tone,
  children,
}: {
  tone: "pending" | "approved" | "rejected" | "staff";
  children: ReactNode;
}) {
  const toneClasses: Record<typeof tone, string> = {
    pending: "bg-pending-bg text-gold",
    approved: "bg-good-bg text-good",
    rejected: "bg-bad-bg text-bad",
    staff: "bg-staff-bg text-staff",
  };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-paper-raised p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Avatar({
  name,
  color,
  size = 26,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full font-bold text-white"
      style={{ background: color, width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-soft">
      {children}
    </div>
  );
}

export function Callout({
  tone = "gold",
  title,
  children,
}: {
  tone?: "gold" | "bad" | "staff";
  title: string;
  children: ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    gold: "bg-pending-bg border-gold",
    bad: "bg-bad-bg border-bad text-bad",
    staff: "bg-staff-bg border-staff text-staff",
  };
  return (
    <div className={`rounded-lg border-l-4 px-4 py-3 text-sm ${toneClasses[tone]}`}>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide">{title}</div>
      <div className={tone === "gold" ? "text-ink" : ""}>{children}</div>
    </div>
  );
}

export function ProgressBar({ yes, no }: { yes: number; no: number }) {
  const total = yes + no;
  const pct = total ? (yes / total) * 100 : 0;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-pending-bg">
      <span className="bg-good" style={{ width: `${pct}%` }} />
      <span className="bg-bad" style={{ width: `${100 - pct}%` }} />
    </div>
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }
) {
  const { className = "", children, ...rest } = props;
  return (
    <button
      {...rest}
      className={`flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-gold-soft disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }
) {
  const { className = "", children, ...rest } = props;
  return (
    <button
      {...rest}
      className={`flex items-center justify-center gap-2 rounded-lg border border-line bg-paper px-3.5 py-2 text-[12.5px] font-semibold text-ink disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }
) {
  const { className = "", children, ...rest } = props;
  return (
    <button
      {...rest}
      className={`flex items-center justify-center gap-2 rounded-lg bg-bad px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function SuccessButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }
) {
  const { className = "", children, ...rest } = props;
  return (
    <button
      {...rest}
      className={`flex items-center justify-center gap-2 rounded-lg bg-good px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-ink-soft">
      {children}
    </label>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[12px] text-ink-soft">{children}</p>;
}
