// Skeleton — example assignment, not a live query. Real version reads the
// signed-in guide's own schedule rows only (see DESIGN.md §5 — the guide
// screen is scoped to "today", not a shrunk admin view).
const SAMPLE_TODAY = {
  tourName: "가우디 핵심 버스 투어",
  time: "09:00",
  meetingPoint: "사그라다 파밀리아 정문",
  headcount: 12,
};

export default function GuideTodayPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-500">오늘 내 일정 (예시)</p>
      <div className="rounded-md border border-line bg-surface p-5">
        <p className="font-display text-xl text-ink-900">{SAMPLE_TODAY.tourName}</p>
        <p className="mt-1 font-mono text-sm text-ink-700">{SAMPLE_TODAY.time}</p>
        <p className="mt-3 text-sm text-ink-700">집합 장소: {SAMPLE_TODAY.meetingPoint}</p>
        <p className="text-sm text-ink-700">인원: {SAMPLE_TODAY.headcount}명</p>
        <button className="mt-4 w-full rounded-sm bg-rose-600 py-3 text-sm font-medium text-white">
          완료 처리
        </button>
      </div>
    </div>
  );
}
