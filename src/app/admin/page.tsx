import Link from "next/link";
import { SAMPLE_RESERVATIONS, SAMPLE_REVIEWS, SAMPLE_SCHEDULES } from "@/lib/sample-data";

// 캘린더는 9월 한 달치 스케줄을 전부 갖고 있어서, 알림판의 "오늘 일정"은
// 대시보드가 흉내 내는 목업 기준일(캘린더의 MOCK_TODAY와 동일)로 걸러야 한다.
const MOCK_TODAY_DATE = "2026-09-17";

export default function AdminDashboardPage() {
  const stats = [
    {
      label: "오늘 일정",
      value: SAMPLE_SCHEDULES.filter((s) => s.date === MOCK_TODAY_DATE).length,
      href: "/admin/schedule",
    },
    { label: "예약 (통합)", value: SAMPLE_RESERVATIONS.length, href: "/admin/reservations" },
    {
      label: "후기 승인 대기",
      value: SAMPLE_REVIEWS.filter((r) => r.status === "pending").length,
      href: "/admin/reviews",
    },
    {
      label: "미정산 건",
      value: SAMPLE_RESERVATIONS.filter((r) => !r.settled).length,
      href: "/admin/reservations",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">알림판</h1>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="bg-surface p-4 transition-colors hover:bg-rose-100">
            <p className="font-mono text-2xl font-semibold text-ink-900">{stat.value}</p>
            <p className="text-xs text-ink-500">{stat.label} (예시)</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
