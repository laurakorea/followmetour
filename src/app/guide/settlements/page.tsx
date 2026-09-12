"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ADDED_GUIDE_SETTLEMENTS_STORAGE_KEY,
  GUIDE_CURRENT_NAME_STORAGE_KEY,
  GUIDE_NAMES,
  GUIDE_SETTLEMENT_COMPLETED_STORAGE_KEY,
  GUIDE_SETTLEMENT_EDITS_STORAGE_KEY,
  SAMPLE_GUIDE_SETTLEMENTS,
  type GuideSettlementSheet,
} from "@/lib/sample-data";

function formatPeriodRange(start: string, end: string) {
  if (!start || !end) return "기간 미정";
  const [sy, sm, sd] = start.split("-");
  const [ey, em, ed] = end.split("-");
  return sy === ey ? `${sy}년 ${sm}월${sd}일~${em}월${ed}일` : `${sy}년 ${sm}월${sd}일~${ey}년 ${em}월${ed}일`;
}

export default function GuideSettlementsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [currentGuide, setCurrentGuide] = useState(GUIDE_NAMES[0] ?? "");
  const [addedSheets, setAddedSheets] = useState<GuideSettlementSheet[]>([]);
  const [sheetEdits, setSheetEdits] = useState<Record<string, GuideSettlementSheet>>({});
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  // 회차(정산서)가 쌓일수록 다 펼쳐두면 스크롤이 너무 길어져서, 한 번에 하나만
  // 펼쳐 보이는 아코디언으로 — 처음엔 가장 최근 회차만 열어둔다.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoExpanded, setAutoExpanded] = useState(false);

  useEffect(() => {
    try {
      const savedGuide = localStorage.getItem(GUIDE_CURRENT_NAME_STORAGE_KEY);
      if (savedGuide) setCurrentGuide(savedGuide);
      const savedSheets = localStorage.getItem(ADDED_GUIDE_SETTLEMENTS_STORAGE_KEY);
      if (savedSheets) setAddedSheets(JSON.parse(savedSheets));
      const savedSheetEdits = localStorage.getItem(GUIDE_SETTLEMENT_EDITS_STORAGE_KEY);
      if (savedSheetEdits) setSheetEdits(JSON.parse(savedSheetEdits));
      const savedCompleted = localStorage.getItem(GUIDE_SETTLEMENT_COMPLETED_STORAGE_KEY);
      if (savedCompleted) setCompleted(JSON.parse(savedCompleted));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 표본 데이터만으로 계속 진행
    }
    setHydrated(true);
  }, []);

  const mySheets = useMemo(
    () =>
      [...SAMPLE_GUIDE_SETTLEMENTS.map((s) => sheetEdits[s.id] ?? s), ...addedSheets]
        .filter((s) => s.guideName === currentGuide)
        .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1)),
    [addedSheets, sheetEdits, currentGuide],
  );

  // 가장 최근 회차 하나는 처음부터 펼쳐서 보여준다.
  useEffect(() => {
    if (!autoExpanded && mySheets.length > 0) {
      setExpandedId(mySheets[0].id);
      setAutoExpanded(true);
    }
  }, [autoExpanded, mySheets]);

  return (
    <div className="flex flex-col gap-4">
      <a href="/guide" className="text-xs text-ink-500 hover:text-rose-700">
        ← 오늘 일정으로
      </a>
      <h1 className="font-display text-lg text-ink-900">내 정산서</h1>
      <p className="text-xs text-ink-500">
        {currentGuide}님으로 로그인됨 · 본인 이름으로 온 정산서만 회차별로 보입니다. 회차를 눌러 펼쳐보세요.
      </p>

      <div className="flex flex-col gap-2">
        {mySheets.length === 0 ? (
          <p className="text-sm text-ink-500">아직 받은 정산서가 없습니다.</p>
        ) : (
          mySheets.map((sheet) => {
            const totalCollected = sheet.collectedItems.reduce((sum, i) => sum + i.amount, 0);
            const totalPayout = sheet.payoutItems.reduce((sum, i) => sum + i.amount, 0);
            const finalAmount = totalCollected - totalPayout;
            const rowCount = Math.max(sheet.collectedItems.length, sheet.payoutItems.length, 1);
            const isCompleted = Boolean(completed[sheet.id]);
            const isOpen = expandedId === sheet.id;
            return (
              <div
                key={sheet.id}
                className={`overflow-hidden rounded-md border ${isCompleted ? "border-good bg-good-wash" : "border-line bg-surface"}`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : sheet.id)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left"
                >
                  <div>
                    <p className="font-display text-sm text-ink-900">
                      {formatPeriodRange(sheet.periodStart, sheet.periodEnd)} 정산서
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      최종 정산 금액 <span className="font-mono text-ink-700">{finalAmount.toLocaleString()}</span>
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
                      성명: {sheet.guideName} · 지역: {sheet.region || "—"}
                    </p>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[380px] text-sm">
                        <thead>
                          <tr className="whitespace-nowrap border-b border-line-strong text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
                            <th className="py-1.5 pr-3 font-medium">정산 해당 날짜</th>
                            <th className="py-1.5 pr-3 text-right font-medium">정산금</th>
                            <th className="border-l border-line py-1.5 pr-3 pl-3 font-medium">지급 항목</th>
                            <th className="py-1.5 text-right font-medium">금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: rowCount }).map((_, i) => {
                            const c = sheet.collectedItems[i];
                            const p = sheet.payoutItems[i];
                            return (
                              <tr key={i} className="whitespace-nowrap border-b border-line">
                                <td className="py-1.5 pr-3 text-ink-700">{c?.label ?? ""}</td>
                                <td className="py-1.5 pr-3 text-right font-mono text-ink-900">
                                  {c ? c.amount.toLocaleString() : ""}
                                </td>
                                <td className="border-l border-line py-1.5 pr-3 pl-3 text-ink-700">{p?.label ?? ""}</td>
                                <td className="py-1.5 text-right font-mono text-ink-900">
                                  {p ? p.amount.toLocaleString() : ""}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 flex flex-col items-end gap-1 text-sm">
                      <p className="text-ink-700">
                        총 지급 금액 <span className="font-mono text-ink-900">{totalPayout.toLocaleString()}</span>
                      </p>
                      <p className="text-ink-700">
                        총 정산 금액 <span className="font-mono text-ink-900">{totalCollected.toLocaleString()}</span>
                      </p>
                      <p className="rounded-sm bg-yellow-100 px-3 py-1.5 font-semibold text-ink-900">
                        최종 정산 금액 <span className="font-mono">{finalAmount.toLocaleString()}</span>
                      </p>
                    </div>
                    <p className="mt-2 text-right text-xs text-ink-500">팔로우미투어</p>
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
