"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ADDED_GUIDE_PAYSLIPS_STORAGE_KEY,
  GUIDE_CURRENT_NAME_STORAGE_KEY,
  GUIDE_NAMES,
  GUIDE_PAYSLIP_COMPLETED_STORAGE_KEY,
  GUIDE_PAYSLIP_EDITS_STORAGE_KEY,
  SAMPLE_GUIDE_PAYSLIPS,
  type GuidePayslip,
} from "@/lib/sample-data";

function formatPayMonth(payMonth: string) {
  if (!payMonth) return "월 미정";
  const [y, m] = payMonth.split("-");
  return `${y}년 ${m}월`;
}

export default function GuidePayslipsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [currentGuide, setCurrentGuide] = useState(GUIDE_NAMES[0] ?? "");
  const [addedPayslips, setAddedPayslips] = useState<GuidePayslip[]>([]);
  const [payslipEdits, setPayslipEdits] = useState<Record<string, GuidePayslip>>({});
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  // 회차(급여명세서)가 쌓일수록 다 펼쳐두면 스크롤이 너무 길어져서, 한 번에
  // 하나만 펼쳐 보이는 아코디언으로 — 처음엔 가장 최근 회차만 열어둔다.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoExpanded, setAutoExpanded] = useState(false);

  useEffect(() => {
    try {
      const savedGuide = localStorage.getItem(GUIDE_CURRENT_NAME_STORAGE_KEY);
      if (savedGuide) setCurrentGuide(savedGuide);
      const savedPayslips = localStorage.getItem(ADDED_GUIDE_PAYSLIPS_STORAGE_KEY);
      if (savedPayslips) setAddedPayslips(JSON.parse(savedPayslips));
      const savedPayslipEdits = localStorage.getItem(GUIDE_PAYSLIP_EDITS_STORAGE_KEY);
      if (savedPayslipEdits) setPayslipEdits(JSON.parse(savedPayslipEdits));
      const savedCompleted = localStorage.getItem(GUIDE_PAYSLIP_COMPLETED_STORAGE_KEY);
      if (savedCompleted) setCompleted(JSON.parse(savedCompleted));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 표본 데이터만으로 계속 진행
    }
    setHydrated(true);
  }, []);

  const myPayslips = useMemo(
    () =>
      [...SAMPLE_GUIDE_PAYSLIPS.map((p) => payslipEdits[p.id] ?? p), ...addedPayslips]
        .filter((p) => p.guideName === currentGuide)
        .sort((a, b) => (a.payMonth < b.payMonth ? 1 : -1)),
    [addedPayslips, payslipEdits, currentGuide],
  );

  // 가장 최근 회차 하나는 처음부터 펼쳐서 보여준다.
  useEffect(() => {
    if (!autoExpanded && myPayslips.length > 0) {
      setExpandedId(myPayslips[0].id);
      setAutoExpanded(true);
    }
  }, [autoExpanded, myPayslips]);

  return (
    <div className="flex flex-col gap-4">
      <a href="/guide" className="text-xs text-ink-500 hover:text-rose-700">
        ← 오늘 일정으로
      </a>
      <h1 className="font-display text-lg text-ink-900">내 급여명세서</h1>
      <p className="text-xs text-ink-500">
        {currentGuide}님으로 로그인됨 · 본인 이름으로 온 급여명세서만 회차별로 보입니다. 회차를 눌러 펼쳐보세요.
      </p>

      <div className="flex flex-col gap-2">
        {myPayslips.length === 0 ? (
          <p className="text-sm text-ink-500">아직 받은 급여명세서가 없습니다.</p>
        ) : (
          myPayslips.map((payslip) => {
            const totalPayment = payslip.paymentItems.reduce((sum, i) => sum + i.amount, 0);
            const totalDeduction = payslip.deductionItems.reduce((sum, i) => sum + i.amount, 0);
            const finalAmount = totalPayment - totalDeduction;
            const rowCount = Math.max(payslip.paymentItems.length, payslip.deductionItems.length, 1);
            const isCompleted = Boolean(completed[payslip.id]);
            const isOpen = expandedId === payslip.id;
            return (
              <div
                key={payslip.id}
                className={`overflow-hidden rounded-md border ${isCompleted ? "border-good bg-good-wash" : "border-line bg-surface"}`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : payslip.id)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left"
                >
                  <div>
                    <p className="font-display text-sm text-ink-900">{formatPayMonth(payslip.payMonth)} 급여명세서</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      차감 수령액 <span className="font-mono text-ink-700">{finalAmount.toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`text-xs ${isCompleted ? "text-good" : "text-ink-500"}`}>
                      {isCompleted ? "처리완료" : "미처리"}
                    </span>
                    <span className="text-ink-500">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-line p-4 pt-3">
                    <p className="text-sm text-ink-700">
                      성명: {payslip.guideName} · 지역: {payslip.region || "—"} · 지급일: {payslip.payDate || "—"}
                    </p>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[380px] text-sm">
                        <thead>
                          <tr className="whitespace-nowrap border-b border-line-strong text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
                            <th className="py-1.5 pr-3 font-medium">지급항목</th>
                            <th className="py-1.5 pr-3 text-right font-medium">지급액</th>
                            <th className="border-l border-line py-1.5 pr-3 pl-3 font-medium">공제항목</th>
                            <th className="py-1.5 text-right font-medium">공제액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: rowCount }).map((_, i) => {
                            const pay = payslip.paymentItems[i];
                            const ded = payslip.deductionItems[i];
                            return (
                              <tr key={i} className="whitespace-nowrap border-b border-line">
                                <td className="py-1.5 pr-3 text-ink-700">{pay?.label ?? ""}</td>
                                <td className="py-1.5 pr-3 text-right font-mono text-ink-900">
                                  {pay ? pay.amount.toLocaleString() : ""}
                                </td>
                                <td className="border-l border-line py-1.5 pr-3 pl-3 text-ink-700">{ded?.label ?? ""}</td>
                                <td className="py-1.5 text-right font-mono text-ink-900">
                                  {ded ? ded.amount.toLocaleString() : ""}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 flex flex-col items-end gap-1 text-sm">
                      <p className="text-ink-700">
                        공제합계 <span className="font-mono text-ink-900">{totalDeduction.toLocaleString()}</span>
                      </p>
                      <p className="text-ink-700">
                        급여계 <span className="font-mono text-ink-900">{totalPayment.toLocaleString()}</span>
                      </p>
                      <p className="rounded-sm bg-yellow-100 px-3 py-1.5 font-semibold text-ink-900">
                        차감 수령액 <span className="font-mono">{finalAmount.toLocaleString()}</span>
                      </p>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-xs text-ink-500">
                      <span>귀하의 노고에 감사드립니다.</span>
                      <span>팔로우미투어</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
