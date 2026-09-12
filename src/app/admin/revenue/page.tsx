"use client";

import { useEffect, useState } from "react";
import { SAMPLE_LEDGER_ENTRIES } from "@/lib/sample-data";

const won = (n: number) => n.toLocaleString("ko-KR");

// 관리자가 예전에 엑셀로 하던 "순수익 정리"를 화면 안에서 직접 적을 수 있게
// 만든 표. 전부 자유 입력칸이고 자동 계산은 안 한다(엑셀처럼 본인이 직접
// 계산해서 넣는 방식) — 합계 줄만 입력된 숫자를 더해서 보여준다. 엑셀에서
// 달마다 새 표로 정리하던 것과 같게, 월별로 표를 따로 둔다. 아직 Supabase가
// 없어 이 브라우저에만 저장된다.
type ProfitRow = {
  date: string;
  tour: string;
  headcount: string;
  revenue: string;
  afterCommission: string; // 수수료 제외한 금액 — 직접 계산해서 입력
  cost: string; // 택시비+로컬 — 합계에는 안 들어가는 순수 메모
  netProfit: string; // 순수익 — 직접 계산해서 입력
  extraIncome: string; // 부가수입(유료) — 순수익과 별도로 합계만 따로 낸다
  extraNote: string; // 추가메모 — 버스비 등 자유 메모
  settled: boolean; // 정산 완료 체크 — 체크하면 그 행을 노란색으로 표시
};

// 가이드 급여·인센티브·세금처럼 달마다 항목과 금액이 바뀌는 고정지출.
// 항목명도 자유롭게 바꿀 수 있어야 해서 라벨·금액 둘 다 입력칸으로 둔다.
type FixedExpenseItem = { label: string; amount: string };

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);
// 대시보드·일정의 목업 기준일(2026-09-17)과 맞춘 기본 선택 연·월.
// 올해만 쓰는 게 아니라서(내년, 내후년...) 연도까지 같이 저장한다.
const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 9;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const PROFIT_ROWS_STORAGE_KEY = "fmt-admin-revenue-profit-rows-by-month";
const FIXED_EXPENSES_STORAGE_KEY = "fmt-admin-revenue-fixed-expenses-by-month";

function emptyRow(): ProfitRow {
  return {
    date: "",
    tour: "",
    headcount: "",
    revenue: "",
    afterCommission: "",
    cost: "",
    netProfit: "",
    extraIncome: "",
    extraNote: "",
    settled: false,
  };
}

function emptyExpense(): FixedExpenseItem {
  return { label: "", amount: "" };
}

function numberOrZero(value: string | undefined) {
  const n = Number((value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function AdminRevenuePage() {
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);
  const [selectedMonthNum, setSelectedMonthNum] = useState(DEFAULT_MONTH);
  const selectedMonth = `${selectedYear}-${pad2(selectedMonthNum)}`;
  const [rowsByMonth, setRowsByMonth] = useState<Record<string, ProfitRow[]>>({});
  const [expensesByMonth, setExpensesByMonth] = useState<Record<string, FixedExpenseItem[]>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedRows = localStorage.getItem(PROFIT_ROWS_STORAGE_KEY);
      if (savedRows) {
        const parsed = JSON.parse(savedRows);
        if (parsed && typeof parsed === "object") {
          // 예전 버전 필드가 남아있을 수 있어서, 새 필드 기본값과 합쳐서
          // 없는 칸은 빈 문자열로 채운다.
          const migrated: Record<string, ProfitRow[]> = {};
          for (const [month, monthRows] of Object.entries(parsed)) {
            if (Array.isArray(monthRows)) {
              migrated[month] = monthRows.map((r) => ({ ...emptyRow(), ...(r as Partial<ProfitRow>) }));
            }
          }
          setRowsByMonth(migrated);
        }
      }
      const savedExpenses = localStorage.getItem(FIXED_EXPENSES_STORAGE_KEY);
      if (savedExpenses) {
        const parsed = JSON.parse(savedExpenses);
        if (parsed && typeof parsed === "object") setExpensesByMonth(parsed);
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
      localStorage.setItem(PROFIT_ROWS_STORAGE_KEY, JSON.stringify(rowsByMonth));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [rowsByMonth, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(FIXED_EXPENSES_STORAGE_KEY, JSON.stringify(expensesByMonth));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [expensesByMonth, hydrated]);

  const rows = rowsByMonth[selectedMonth] && rowsByMonth[selectedMonth].length > 0
    ? rowsByMonth[selectedMonth]
    : [emptyRow()];
  const expenses = expensesByMonth[selectedMonth] && expensesByMonth[selectedMonth].length > 0
    ? expensesByMonth[selectedMonth]
    : [emptyExpense()];

  function updateRow(index: number, field: keyof ProfitRow, value: string) {
    setRowsByMonth((prev) => {
      const current = prev[selectedMonth] && prev[selectedMonth].length > 0 ? prev[selectedMonth] : [emptyRow()];
      const next = current.map((row, i) => (i === index ? { ...row, [field]: value } : row));
      return { ...prev, [selectedMonth]: next };
    });
  }

  function toggleSettled(index: number) {
    setRowsByMonth((prev) => {
      const current = prev[selectedMonth] && prev[selectedMonth].length > 0 ? prev[selectedMonth] : [emptyRow()];
      const next = current.map((row, i) => (i === index ? { ...row, settled: !row.settled } : row));
      return { ...prev, [selectedMonth]: next };
    });
  }

  function addRow() {
    setRowsByMonth((prev) => {
      const current = prev[selectedMonth] && prev[selectedMonth].length > 0 ? prev[selectedMonth] : [emptyRow()];
      return { ...prev, [selectedMonth]: [...current, emptyRow()] };
    });
  }

  function removeRow(index: number) {
    setRowsByMonth((prev) => {
      const current = prev[selectedMonth] && prev[selectedMonth].length > 0 ? prev[selectedMonth] : [emptyRow()];
      if (current.length <= 1) return prev;
      return { ...prev, [selectedMonth]: current.filter((_, i) => i !== index) };
    });
  }

  function updateExpense(index: number, field: keyof FixedExpenseItem, value: string) {
    setExpensesByMonth((prev) => {
      const current = prev[selectedMonth] && prev[selectedMonth].length > 0 ? prev[selectedMonth] : [emptyExpense()];
      const next = current.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      return { ...prev, [selectedMonth]: next };
    });
  }

  function addExpense() {
    setExpensesByMonth((prev) => {
      const current = prev[selectedMonth] && prev[selectedMonth].length > 0 ? prev[selectedMonth] : [emptyExpense()];
      return { ...prev, [selectedMonth]: [...current, emptyExpense()] };
    });
  }

  function removeExpense(index: number) {
    setExpensesByMonth((prev) => {
      const current = prev[selectedMonth] && prev[selectedMonth].length > 0 ? prev[selectedMonth] : [emptyExpense()];
      if (current.length <= 1) return prev;
      return { ...prev, [selectedMonth]: current.filter((_, i) => i !== index) };
    });
  }

  const totalHeadcount = rows.reduce((sum, r) => sum + numberOrZero(r.headcount), 0);
  const totalRevenue = rows.reduce((sum, r) => sum + numberOrZero(r.revenue), 0);
  const totalNet = rows.reduce((sum, r) => sum + numberOrZero(r.netProfit), 0);
  const totalExtraIncome = rows.reduce((sum, r) => sum + numberOrZero(r.extraIncome), 0);
  const totalFixedExpenses = expenses.reduce((sum, e) => sum + numberOrZero(e.amount), 0);
  const netAfterFixedExpenses = totalNet - totalFixedExpenses;

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

      <div className="flex flex-col gap-4 border-t border-line pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-ink-900">월별 정산</h2>
          <p className="text-xs text-ink-500">
            엑셀로 따로 하시던 순수익 정리를 여기서 직접 — 이 브라우저에만 저장됩니다
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y - 1)}
            aria-label="이전 연도"
            className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-700 hover:bg-paper"
          >
            ‹
          </button>
          <span className="w-14 text-center font-mono text-sm text-ink-900">{selectedYear}년</span>
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y + 1)}
            aria-label="다음 연도"
            className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-700 hover:bg-paper"
          >
            ›
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          {MONTH_NUMBERS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMonthNum(m)}
              className={`rounded-sm border px-2.5 py-1 text-xs ${
                m === selectedMonthNum
                  ? "border-rose-600 bg-rose-600 text-white"
                  : "border-line text-ink-700 hover:bg-paper"
              }`}
            >
              {m}월
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink-900">고정지출</h3>
          <p className="text-xs text-ink-500">
            가이드 급여·후기 인센티브·세금처럼 달마다 항목·금액이 바뀌는 고정비를 직접 적는다.
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {expenses.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1 rounded-sm border border-line p-2">
                <div className="flex items-center gap-1">
                  <input
                    value={item.label}
                    onChange={(e) => updateExpense(idx, "label", e.target.value)}
                    placeholder="항목 (예: 김건우)"
                    className="min-w-0 flex-1 rounded-sm border border-line bg-transparent px-2 py-1 text-sm focus:border-line-strong focus:outline-none"
                  />
                  {expenses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExpense(idx)}
                      aria-label="항목 삭제"
                      className="text-ink-500 hover:text-critical"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <input
                  value={item.amount}
                  onChange={(e) => updateExpense(idx, "amount", e.target.value)}
                  placeholder="금액"
                  inputMode="numeric"
                  className="rounded-sm border border-line bg-transparent px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addExpense}
            className="self-start rounded-sm border border-line px-2.5 py-1 text-xs text-ink-700 hover:bg-paper"
          >
            항목 추가
          </button>

          <div className="mt-1 flex items-center justify-between rounded-sm border border-line bg-paper px-3 py-2 text-sm">
            <span className="text-ink-700">고정지출 합계</span>
            <span className="font-mono font-semibold text-ink-900">{won(totalFixedExpenses)}</span>
          </div>

          <div className="rounded-sm bg-yellow-100 px-3 py-3 text-center">
            <p className="text-xs text-ink-500">
              {selectedYear}년 {selectedMonthNum}월 순수익 − 고정지출
            </p>
            <p className="font-mono text-lg font-semibold text-ink-900">{won(Math.round(netAfterFixedExpenses))}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-ink-900">순수익 계산기</h3>

          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="whitespace-nowrap bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
                  <th className="px-3 py-2 font-medium">정산</th>
                  <th className="px-3 py-2 font-medium">날짜</th>
                  <th className="px-3 py-2 font-medium">투어</th>
                  <th className="px-3 py-2 font-medium">인원수</th>
                  <th className="px-3 py-2 font-medium">매출(₩)</th>
                  <th className="px-3 py-2 font-medium">수수료제외금액(₩)</th>
                  <th className="px-3 py-2 font-medium">택시비+로컬</th>
                  <th className="px-3 py-2 font-medium">순수익(₩)</th>
                  <th className="px-3 py-2 font-medium">부가수입(유료)(₩)</th>
                  <th className="px-3 py-2 font-medium">추가메모</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`whitespace-nowrap border-t border-line ${row.settled ? "bg-yellow-100" : ""}`}
                  >
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={row.settled}
                        onChange={() => toggleSettled(idx)}
                        title="정산 완료"
                        className="h-3.5 w-3.5 accent-amber-500"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.date}
                        onChange={(e) => updateRow(idx, "date", e.target.value)}
                        placeholder="1일"
                        className="w-16 rounded-sm border border-line bg-transparent px-2 py-1 text-sm focus:border-line-strong focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.tour}
                        onChange={(e) => updateRow(idx, "tour", e.target.value)}
                        placeholder="마스터2"
                        className="w-24 rounded-sm border border-line bg-transparent px-2 py-1 text-sm focus:border-line-strong focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.headcount}
                        onChange={(e) => updateRow(idx, "headcount", e.target.value)}
                        inputMode="numeric"
                        className="w-16 rounded-sm border border-line bg-transparent px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.revenue}
                        onChange={(e) => updateRow(idx, "revenue", e.target.value)}
                        inputMode="numeric"
                        className="w-28 rounded-sm border border-line bg-transparent px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.afterCommission}
                        onChange={(e) => updateRow(idx, "afterCommission", e.target.value)}
                        inputMode="numeric"
                        className="w-28 rounded-sm border border-line bg-transparent px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.cost}
                        onChange={(e) => updateRow(idx, "cost", e.target.value)}
                        placeholder="385+180"
                        className="w-24 rounded-sm border border-line bg-transparent px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.netProfit}
                        onChange={(e) => updateRow(idx, "netProfit", e.target.value)}
                        inputMode="numeric"
                        className="w-28 rounded-sm border border-line bg-transparent px-2 py-1 text-sm font-mono font-semibold text-ink-900 focus:border-line-strong focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.extraIncome}
                        onChange={(e) => updateRow(idx, "extraIncome", e.target.value)}
                        inputMode="numeric"
                        className="w-24 rounded-sm border border-line bg-transparent px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.extraNote}
                        onChange={(e) => updateRow(idx, "extraNote", e.target.value)}
                        placeholder="예: 인디고버스비"
                        className="w-32 rounded-sm border border-line bg-transparent px-2 py-1 text-sm focus:border-line-strong focus:outline-none"
                      />
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
                  <td className="px-3 py-2 font-medium text-ink-900" colSpan={3}>
                    {selectedYear}년 {selectedMonthNum}월 합계
                  </td>
                  <td className="px-3 py-2">{totalHeadcount}</td>
                  <td className="px-3 py-2">{won(totalRevenue)}</td>
                  <td colSpan={2}></td>
                  <td className="px-3 py-2 text-right font-semibold text-ink-900">{won(Math.round(totalNet))}</td>
                  <td className="px-3 py-2">{won(totalExtraIncome)}</td>
                  <td></td>
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
    </div>
  );
}
