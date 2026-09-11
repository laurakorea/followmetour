/**
 * Admin surface — staff auth required (not wired yet). Responsive for real:
 * desktop is primary (sidebar, full tables), mobile is a workable secondary
 * (DESIGN.md §4). Nav is grouped by workflow, not the flat WP menu dump.
 */
const NAV_GROUPS = [
  {
    label: "예약 운영",
    items: [
      { href: "/admin/schedule", label: "일정" },
      { href: "/admin/reservations", label: "예약" },
    ],
  },
  {
    label: "정산",
    items: [
      { href: "/admin/revenue", label: "수입관리" },
      { href: "/admin/tickets", label: "티켓관리" },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { href: "/admin/tours", label: "투어 (마이리얼트립 URL 관리)" },
      { href: "/admin/reviews", label: "후기 모더레이션" },
    ],
  },
  {
    label: "시스템",
    items: [{ href: "/admin/users", label: "계정" }],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="border-b border-line md:w-56 md:flex-none md:border-b-0 md:border-r">
        <div className="px-4 py-3 font-display text-lg text-ink-900">관리자</div>
        <nav className="flex flex-col gap-4 px-2 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-1 font-mono text-xs tracking-wide text-ink-500 uppercase">
                {group.label}
              </p>
              <div className="flex flex-col">
                {group.items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-sm px-2 py-1.5 text-sm text-ink-700 hover:bg-rose-100 hover:text-rose-700"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
