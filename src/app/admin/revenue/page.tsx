"use client";

import { useEffect, useState } from "react";
import { SAMPLE_LEDGER_ENTRIES } from "@/lib/sample-data";

const won = (n: number) => n.toLocaleString("ko-KR");

// 관리자가 예전에 엑셀로 하던 "순수익 정리"를 화면 안에서 직접 계산할 수 있게
// 만든 표. 수수료율·비용은 투어마다 다르고 자유롭게 적어야 해서 전부 입력칸으로
// 두고, 순수익만 자동 계산한다. 아직 Supabase가 없어 이 브라우저에만 저장된다.
type ProfitRow = {
  date: string;
  tour: string;
  headcount: string;
  revenue: string;
  commissionPercent: string; // 마이리얼트립 등 수수료율(%)
  cost: string; // 택시비+로컬 등 현장 비용
  busNote: string; // 예: "인디고버스비", "마스터2+핵심 버스쉐어"
};

const PROFIT_ROWS_STORAGE_KEY = "fmt-admin-revenue-profit-rows";

function emptyRow(): ProfitRow {
  return { date: "", tour: "", headcount: "", revenue: "", commissionPercent: "", cost: "", busNote: "" };
}

function numberOrZero(value: string) {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function computeNet(row: ProfitRow) {
  const revenue = numberOrZero(row.revenue);
  const commissionRate = numberOrZero(row.commissionPercent) / 100;
  const afterCommission = revenue * (1 - commissionRate);
  return afterCommission - numberOrZero(row.cost);
}

export default function AdminRevenuePage() {
  const [rows, setRows] = useState<ProfitRow[]>([emptyRow()]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFIT_ROWS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setRows(parsed);
      }
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 빈 표로 계속 진행
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(PROFIT_ROWS_STORAGE_KEY, JSON.stringify(rows));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [rows, hydrated]);

  function updateRow(index: number, field: keyof ProfitRow, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  const totalHeadcount = rows.reduce((sum, r) => sum + numberOrZero(r.headcount), 0);
  const totalRevenue = rows.reduce((sum, r) => sum + numberOrZero(r.revenue), 0);
  const totalNet = rows.reduce((sum, r) => sum + computeNet(r), 0);

  return (
    <div className="flex flex-col gap-8">
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

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-ink-900">순수익 계산기</h2>
          <p className="text-xs text-ink-500">
            엑셀로 따로 하시던 순수익 정리를 여기서 직접 — 이 브라우저에만 저장됩니다
          </p>
        </div>

        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="whitespace-nowrap bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
                <th className="px-3 py-2 font-medium">날짜</th>
                <th className="px-3 py-2 font-medium">투어</th>
                <th className="px-3 py-2 font-medium">인원수</th>
                <th className="px-3 py-2 font-medium">매출(₩)</th>
                <th className="px-3 py-2 font-medium">수수료율(%)</th>
                <th className="px-3 py-2 font-medium">택시비+로컬(₩)</th>
                <th className="px-3 py-2 font-medium">버스비 메모</th>
                <th className="px-3 py-2 font-medium">순수익(₩)</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="whitespace-nowrap border-t border-line">
                  <td className="px-2 py-1.5">
                    <input
                      value={row.date}
                      onChange={(e) => updateRow(idx, "date", e.target.value)}
                      placeholder="1일"
                      className="w-16 rounded-sm border border-line px-2 py-1 text-sm focus:border-line-strong focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.tour}
                      onChange={(e) => updateRow(idx, "tour", e.target.value)}
                      placeholder="마스터2"
                      className="w-24 rounded-sm border border-line px-2 py-1 text-sm focus:border-line-strong focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.headcount}
                      onChange={(e) => updateRow(idx, "headcount", e.target.value)}
                      inputMode="numeric"
                      className="w-16 rounded-sm border border-line px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.revenue}
                      onChange={(e) => updateRow(idx, "revenue", e.target.value)}
                      inputMode="numeric"
                      className="w-28 rounded-sm border border-line px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.commissionPercent}
                      onChange={(e) => updateRow(idx, "commissionPercent", e.target.value)}
                      placeholder="30"
                      inputMode="numeric"
                      className="w-16 rounded-sm border border-line px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.cost}
                      onChange={(e) => updateRow(idx, "cost", e.target.value)}
                      placeholder="385+180"
                      className="w-24 rounded-sm border border-line px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.busNote}
                      onChange={(e) => updateRow(idx, "busNote", e.target.value)}
                      placeholder="인디고버스비"
                      className="w-32 rounded-sm border border-line px-2 py-1 text-sm focus:border-line-strong focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-ink-900">
                    {won(Math.round(computeNet(row)))}
                  </td>
                  <td className="px-2 py-1.5">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        aria-label="행 삭제"
                        className="text-ink-500 hover:text-critical"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="whitespace-nowrap border-t border-line-strong bg-paper font-mono text-xs text-ink-700">
                <td className="px-3 py-2 font-medium text-ink-900" colSpan={2}>
                  합계
                </td>
                <td className="px-3 py-2">{totalHeadcount}</td>
                <td className="px-3 py-2">{won(totalRevenue)}</td>
                <td colSpan={2}></td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-right font-semibold text-ink-900">{won(Math.round(totalNet))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button
          type="button"
          onClick={addRow}
          className="self-start rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
        >
          행 추가
        </button>
      </div>
    </div>
  );
}
