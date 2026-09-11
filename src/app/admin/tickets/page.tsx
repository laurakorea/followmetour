import { StatusPill } from "@/components/status-pill";
import { SAMPLE_TICKET_ENTRIES } from "@/lib/sample-data";

export default function AdminTicketsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">티켓관리</h1>
        <p className="text-xs text-ink-500">예시 데이터 · 장소별 입장권 매입원가/판매수익</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
              <th className="px-4 py-2 font-medium">날짜</th>
              <th className="px-4 py-2 font-medium">장소</th>
              <th className="px-4 py-2 font-medium">투어</th>
              <th className="px-4 py-2 font-medium">구분</th>
              <th className="px-4 py-2 font-medium">채널</th>
              <th className="px-4 py-2 font-medium">금액</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_TICKET_ENTRIES.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="px-4 py-2.5 font-mono text-ink-700">{t.date}</td>
                <td className="px-4 py-2.5 text-ink-900">{t.venue}</td>
                <td className="px-4 py-2.5 text-ink-700">{t.tourName}</td>
                <td className="px-4 py-2.5">
                  <StatusPill tone={t.direction === "income" ? "good" : "warn"}>
                    {t.direction === "income" ? "수입" : "지출"}
                  </StatusPill>
                </td>
                <td className="px-4 py-2.5 text-ink-700">{t.channel}</td>
                <td className="px-4 py-2.5 font-mono text-ink-900">{t.amount.toLocaleString("ko-KR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
