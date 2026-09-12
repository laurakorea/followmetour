"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ADDED_SCHEDULES_STORAGE_KEY,
  ASSIGNABLE_GUIDES,
  SAMPLE_SCHEDULES,
  SCHEDULE_GUIDES_STORAGE_KEY,
  TOUR_DURATION_HOURS,
  type Schedule,
} from "@/lib/sample-data";

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);
// 일정 페이지의 목업 기준일(2026-09-17)과 맞춘 기본 선택 연·월.
const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 9;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatHours(h: number) {
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

export default function AdminGuideAssignmentsPage() {
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);
  const [selectedMonthNum, setSelectedMonthNum] = useState(DEFAULT_MONTH);
  // 일정 페이지가 쓰는 것과 같은 localStorage 키를 읽기만 한다 — 쓰기는
  // 일정 페이지 쪽에서만 한다.
  const [addedSchedules, setAddedSchedules] = useState<Schedule[]>([]);
  const [guideAssignments, setGuideAssignments] = useState<Record<string, string[]>>({});

  useEffect(() => {
    try {
      const savedAdded = localStorage.getItem(ADDED_SCHEDULES_STORAGE_KEY);
      if (savedAdded) setAddedSchedules(JSON.parse(savedAdded));
      const savedGuides = localStorage.getItem(SCHEDULE_GUIDES_STORAGE_KEY);
      if (savedGuides) setGuideAssignments(JSON.parse(savedGuides));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 표본 데이터만으로 계속 진행
    }
  }, []);

  const allSchedules = useMemo(() => [...SAMPLE_SCHEDULES, ...addedSchedules], [addedSchedules]);

  function getAssignedGuides(schedule: Schedule) {
    return guideAssignments[schedule.id] ?? schedule.guideNames;
  }

  const monthPrefix = `${selectedYear}-${pad2(selectedMonthNum)}`;
  const monthSchedules = useMemo(
    () => allSchedules.filter((s) => s.date.startsWith(monthPrefix)),
    [allSchedules, monthPrefix],
  );

  // 투어별 · 가이드별로 "몇 번, 몇 시간"을 센다. 투어 목록은 그 달에 실제로
  // 스케줄이 있던 순서 그대로 보여준다.
  const { tourOrder, counts, guideTotals } = useMemo(() => {
    const order: { tourId: string; tourName: string }[] = [];
    const seen = new Set<string>();
    const table: Record<string, Record<string, { count: number; hours: number }>> = {};
    const totals: Record<string, { count: number; hours: number }> = {};

    for (const schedule of monthSchedules) {
      if (!seen.has(schedule.tourId)) {
        seen.add(schedule.tourId);
        order.push({ tourId: schedule.tourId, tourName: schedule.tourName });
        table[schedule.tourId] = {};
      }
      const hoursPerRun = TOUR_DURATION_HOURS[schedule.tourId] ?? 0;
      for (const guide of getAssignedGuides(schedule)) {
        const cell = table[schedule.tourId][guide] ?? { count: 0, hours: 0 };
        cell.count += 1;
        cell.hours += hoursPerRun;
        table[schedule.tourId][guide] = cell;

        const total = totals[guide] ?? { count: 0, hours: 0 };
        total.count += 1;
        total.hours += hoursPerRun;
        totals[guide] = total;
      }
    }

    return { tourOrder: order, counts: table, guideTotals: totals };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthSchedules, guideAssignments]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">가이드배정확인</h1>
        <p className="text-xs text-ink-500">
          예시 데이터 · 마스터패스 6.5h · 핵심버스 5h · 야간투어 1h 기준 자동 집계
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setSelectedYear((y) => y - 1)}
          aria-label="이전 연도"
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-700 hover:bg-rose-100 hover:text-rose-700"
        >
          ‹
        </button>
        <span className="w-14 text-center font-mono text-sm text-ink-900">{selectedYear}년</span>
        <button
          type="button"
          onClick={() => setSelectedYear((y) => y + 1)}
          aria-label="다음 연도"
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-700 hover:bg-rose-100 hover:text-rose-700"
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

      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="whitespace-nowrap bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
              <th className="px-3 py-2 font-medium">
                {selectedYear}년 {selectedMonthNum}월 투어 배정
              </th>
              {ASSIGNABLE_GUIDES.map((name) => (
                <th key={name} className="px-3 py-2 text-center font-medium">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tourOrder.length === 0 ? (
              <tr>
                <td colSpan={ASSIGNABLE_GUIDES.length + 1} className="px-4 py-6 text-center text-sm text-ink-500">
                  이 달에는 열린 투어가 없습니다.
                </td>
              </tr>
            ) : (
              tourOrder.map(({ tourId, tourName }) => (
                <tr key={tourId} className="whitespace-nowrap border-t border-line">
                  <td className="px-3 py-2 text-ink-900">{tourName}</td>
                  {ASSIGNABLE_GUIDES.map((name) => {
                    const cell = counts[tourId]?.[name];
                    return (
                      <td key={name} className="px-3 py-2 text-center font-mono text-ink-700">
                        {cell ? (
                          <>
                            {cell.count}번
                            <span className="text-ink-500"> ({formatHours(cell.hours)}h)</span>
                          </>
                        ) : (
                          <span className="text-ink-500">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          {tourOrder.length > 0 && (
            <tfoot>
              <tr className="whitespace-nowrap border-t border-line-strong bg-paper font-mono text-xs text-ink-700">
                <td className="px-3 py-2 font-medium text-ink-900">합계</td>
                {ASSIGNABLE_GUIDES.map((name) => {
                  const total = guideTotals[name];
                  return (
                    <td key={name} className="px-3 py-2 text-center font-semibold text-ink-900">
                      {total ? (
                        <>
                          {total.count}번
                          <span className="font-normal text-ink-500"> ({formatHours(total.hours)}h)</span>
                        </>
                      ) : (
                        <span className="text-ink-500">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
