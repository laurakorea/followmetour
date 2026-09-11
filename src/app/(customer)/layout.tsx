/**
 * Customer surface — public, no auth. Mobile-only design target (DESIGN.md §4):
 * verify on a ~375px viewport, desktop is "doesn't break" not "designed for".
 */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-display text-lg text-ink-900">
          <span className="text-rose-600">●</span> followmetour
        </span>
        <nav className="flex gap-4 text-sm text-ink-700">
          <a href="/">투어</a>
          <a href="/reviews">후기</a>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line px-4 py-6 text-xs text-ink-500">
        © 팔로우미투어
      </footer>
    </div>
  );
}
