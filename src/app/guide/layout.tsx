/**
 * Guide surface — staff auth required (not wired yet). Mobile-only
 * (DESIGN.md §4): a single lightweight screen, not a shrunk admin view.
 */
export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <header className="px-4 py-3 font-display text-lg text-ink-900">가이드</header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
