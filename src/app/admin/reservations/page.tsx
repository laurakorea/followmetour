import { StatusPill } from "@/components/status-pill";
import { SAMPLE_RESERVATIONS, type ReservationStatus } from "@/lib/sample-data";

const STATUS_LABEL: Record<ReservationStatus, { label: string; tone: "good" | "warn" | "critical" | "neutral" }> = {
  pending: { label: "대기", tone: "neutral" },
  confirmed: { label: "예약완료", tone: "good" },
  completed: { label: "투어완료", tone: "good" },
  cancelled_unpaid: { label: "미입금취소", tone: "critical" },
  cancelled_by_customer: { label: "고객요청취소", tone: "critical" },
  cancelled_refunded: { label: "환불취소", tone: "critical" },
};

export default function AdminReservationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">예약</h1>
        <p className="text-xs text-ink-500">예시 데이터 · 자사·파트너 통합</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
              <th className="px-4 py-2 font-medium">상태</th>
              <th className="px-4 py-2 font-medium">채널</th>
              <th className="px-4 py-2 font-medium">투어</th>
              <th className="px-4 py-2 font-medium">날짜</th>
              <th className="px-4 py-2 font-medium">담당자</th>
              <th className="px-4 py-2 font-medium">인원</th>
              <th className="px-4 py-2 font-medium">정산</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_RESERVATIONS.map((r) => {
              const status = STATUS_LABEL[r.status];
              return (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-2.5">
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  </td>
                  <td className="px-4 py-2.5 text-ink-700">
                    {r.channel === "partner_agency" ? r.partnerName : "자사"}
                  </td>
                  <td className="px-4 py-2.5 text-ink-900">{r.tourName}</td>
                  <td className="px-4 py-2.5 font-mono text-ink-700">{r.date}</td>
                  <td className="px-4 py-2.5 text-ink-700">{r.contactName}</td>
                  <td className="px-4 py-2.5 font-mono text-ink-700">{r.headcount}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill tone={r.settled ? "good" : "neutral"}>
                      {r.settled ? "정산완료" : "미정산"}
                    </StatusPill>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
