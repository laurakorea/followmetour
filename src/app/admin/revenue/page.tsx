import { SAMPLE_LEDGER_ENTRIES } from "@/lib/sample-data";

const won = (n: number) => n.toLocaleString("ko-KR");

export default function AdminRevenuePage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">수입관리</h1>
        <p className="text-xs text-ink-500">예시 데이터 · 회차별 자동 결산</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
              <th className="px-4 py-2 font-medium">날짜</th>
              <th className="px-4 py-2 font-medium">투어</th>
              <th className="px-4 py-2 font-medium">가이드</th>
              <th className="px-4 py-2 font-medium">인원</th>
              <th className="px-4 py-2 font-medium">입장권요금</th>
              <th className="px-4 py-2 font-medium">기타수입</th>
              <th className="px-4 py-2 font-medium">기타지출</th>
              <th className="px-4 py-2 font-medium">결산</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_LEDGER_ENTRIES.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-4 py-2.5 font-mono text-ink-700">{e.date}</td>
                <td className="px-4 py-2.5 text-ink-900">{e.tourName}</td>
                <td className="px-4 py-2.5 text-ink-700">{e.guideName}</td>
                <td className="px-4 py-2.5 font-mono text-ink-700">{e.headcount}</td>
                <td className="px-4 py-2.5 font-mono text-ink-700">{won(e.ticketFee)}</td>
                <td className="px-4 py-2.5 font-mono text-ink-700">{won(e.miscIncome)}</td>
                <td className="px-4 py-2.5 font-mono text-ink-700">{won(e.miscExpense)}</td>
                <td className="px-4 py-2.5 font-mono font-semibold text-ink-900">{won(e.settlement)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
