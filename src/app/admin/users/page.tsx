import { StatusPill } from "@/components/status-pill";
import { SAMPLE_STAFF } from "@/lib/sample-data";

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">계정</h1>
        <p className="text-xs text-ink-500">예시 데이터 · 스태프 전용(고객 계정 없음)</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
              <th className="px-4 py-2 font-medium">이름</th>
              <th className="px-4 py-2 font-medium">역할</th>
              <th className="px-4 py-2 font-medium">연락처</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_STAFF.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="px-4 py-2.5 text-ink-900">{s.name}</td>
                <td className="px-4 py-2.5">
                  <StatusPill tone={s.role === "admin" ? "good" : "neutral"}>
                    {s.role === "admin" ? "관리자" : "가이드"}
                  </StatusPill>
                </td>
                <td className="px-4 py-2.5 font-mono text-ink-700">{s.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
