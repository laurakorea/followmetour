const TONES = {
  good: "bg-good-wash text-good",
  warn: "bg-warn-wash text-warn",
  critical: "bg-critical-wash text-critical",
  neutral: "bg-line text-ink-700",
} as const;

export function StatusPill({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs ${TONES[tone]}`}>
      {children}
    </span>
  );
}
