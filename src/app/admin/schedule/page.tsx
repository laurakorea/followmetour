import { SAMPLE_SCHEDULES } from "@/lib/sample-data";

export default function AdminSchedulePage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">일정</h1>
        <p className="text-xs text-ink-500">예시 데이터 · 2026-09-17</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
              <th className="px-4 py-2 font-medium">투어</th>
              <th className="px-4 py-2 font-medium">날짜</th>
              <th className="px-4 py-2 font-medium">시간</th>
              <th className="px-4 py-2 font-medium">정원</th>
              <th className="px-4 py-2 font-medium">가이드</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_SCHEDULES.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="px-4 py-2.5 text-ink-900">{s.tourName}</td>
                <td className="px-4 py-2.5 font-mono text-ink-700">{s.date}</td>
                <td className="px-4 py-2.5 font-mono text-ink-700">{s.startTime}</td>
                <td className="px-4 py-2.5 font-mono text-ink-700">{s.capacity}</td>
                <td className="px-4 py-2.5 text-ink-700">{s.guideName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
