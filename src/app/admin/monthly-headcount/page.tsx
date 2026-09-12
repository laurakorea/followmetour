"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ADDED_RESERVATIONS_STORAGE_KEY,
  ADDED_SCHEDULES_STORAGE_KEY,
  RESERVATION_EDITS_STORAGE_KEY,
  SAMPLE_RESERVATIONS,
  SAMPLE_SCHEDULES,
  SAMPLE_TOURS,
  SCHEDULE_CAPACITY_STORAGE_KEY,
  type Reservation,
  type Schedule,
} from "@/lib/sample-data";

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);
// 일정·수입관리 페이지의 목업 기준일(2026-09-17)과 맞춘 기본 선택 연·월.
const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 9;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function AdminMonthlyHeadcountPage() {
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);
  const [selectedMonthNum, setSelectedMonthNum] = useState(DEFAULT_MONTH);
  // 일정 페이지가 쓰는 것과 같은 localStorage 키를 읽기만 한다 — 쓰기는
  // 일정·예약 페이지 쪽에서만 한다.
  const [addedSchedules, setAddedSchedules] = useState<Schedule[]>([]);
  const [capacityOverrides, setCapacityOverrides] = useState<Record<string, number>>({});
  const [addedReservations, setAddedReservations] = useState<Reservation[]>([]);
  const [reservationEdits, setReservationEdits] = useState<Record<string, Reservation>>({});

  useEffect(() => {
    try {
      const savedAddedSchedules = localStorage.getItem(ADDED_SCHEDULES_STORAGE_KEY);
      if (savedAddedSchedules) setAddedSchedules(JSON.parse(savedAddedSchedules));
      const savedCapacity = localStorage.getItem(SCHEDULE_CAPACITY_STORAGE_KEY);
      if (savedCapacity) setCapacityOverrides(JSON.parse(savedCapacity));
      const savedAddedReservations = localStorage.getItem(ADDED_RESERVATIONS_STORAGE_KEY);
      if (savedAddedReservations) setAddedReservations(JSON.parse(savedAddedReservations));
      const savedReservationEdits = localStorage.getItem(RESERVATION_EDITS_STORAGE_KEY);
      if (savedReservationEdits) setReservationEdits(JSON.parse(savedReservationEdits));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 표본 데이터만으로 계속 진행
    }
  }, []);

  const allSchedules = useMemo(() => [...SAMPLE_SCHEDULES, ...addedSchedules], [addedSchedules]);
  const allReservations = useMemo(
    () => [...SAMPLE_RESERVATIONS, ...addedReservations].map((r) => reservationEdits[r.id] ?? r),
    [addedReservations, reservationEdits],
  );

  function getCapacity(schedule: Schedule) {
    return capacityOverrides[schedule.id] ?? schedule.capacity;
  }

  function bookedHeadcount(scheduleId: string) {
    return allReservations
      .filter((r) => r.scheduleId === scheduleId && r.status !== "cancelled")
      .reduce((sum, r) => sum + r.headcount, 0);
  }

  const monthPrefix = `${selectedYear}-${pad2(selectedMonthNum)}`;
  const monthSchedules = useMemo(
    () => allSchedules.filter((s) => s.date.startsWith(monthPrefix)),
    [allSchedules, monthPrefix],
  );

  const { dates, tourColumns, cellFor } = useMemo(() => {
    const dateSet = new Set(monthSchedules.map((s) => s.date));
    const sortedDates = Array.from(dateSet).sort();

    const tourIdsPresent = new Set(monthSchedules.map((s) => s.tourId));
    const columns = SAMPLE_TOURS.filter((t) => tourIdsPresent.has(t.id));

    const byDateAndTour = new Map<string, Schedule[]>();
    for (const s of monthSchedules) {
      const key = `${s.date}::${s.tourId}`;
      const list = byDateAndTour.get(key) ?? [];
      list.push(s);
      byDateAndTour.set(key, list);
    }

    function cell(date: string, tourId: string) {
      const schedules = byDateAndTour.get(`${date}::${tourId}`) ?? [];
      if (schedules.length === 0) return null;
      let booked = 0;
      let capacity = 0;
      for (const s of schedules) {
        booked += bookedHeadcount(s.id);
        capacity += getCapacity(s);
      }
      return { booked, capacity };
    }

    return { dates: sortedDates, tourColumns: columns, cellFor: cell };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthSchedules, capacityOverrides, allReservations]);

  const dayTotal = (date: string) =>
    tourColumns.reduce(
      (sum, t) => {
        const c = cellFor(date, t.id);
        return c ? { booked: sum.booked + c.booked, capacity: sum.capacity + c.capacity } : sum;
      },
      { booked: 0, capacity: 0 },
    );

  const columnTotal = (tourId: string) =>
    dates.reduce(
      (sum, date) => {
        const c = cellFor(date, tourId);
        return c ? { booked: sum.booked + c.booked, capacity: sum.capacity + c.capacity } : sum;
      },
      { booked: 0, capacity: 0 },
    );

  const grandTotal = dates.reduce(
    (sum, date) => {
      const d = dayTotal(date);
      return { booked: sum.booked + d.booked, capacity: sum.capacity + d.capacity };
    },
    { booked: 0, capacity: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">월별인원관리</h1>
        <p className="text-xs text-ink-500">예시 데이터 · 예약인원/정원 자동 집계(취소 제외)</p>
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
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="whitespace-nowrap bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
              <th className="px-3 py-2 font-medium">날짜</th>
              {tourColumns.map((t) => (
                <th key={t.id} className="px-3 py-2 text-center font-medium">
                  {t.name}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium">합계</th>
            </tr>
          </thead>
          <tbody>
            {dates.length === 0 ? (
              <tr>
                <td colSpan={tourColumns.length + 2} className="px-4 py-6 text-center text-sm text-ink-500">
                  이 달에는 열린 투어가 없습니다.
                </td>
              </tr>
            ) : (
              dates.map((date) => {
                const total = dayTotal(date);
                return (
                  <tr key={date} className="whitespace-nowrap border-t border-line">
                    <td className="px-3 py-2 font-mono text-ink-700">{date.slice(-2)}일</td>
                    {tourColumns.map((t) => {
                      const c = cellFor(date, t.id);
                      return (
                        <td key={t.id} className="px-3 py-2 text-center font-mono text-ink-700">
                          {c ? `${c.booked}/${c.capacity}` : <span className="text-ink-500">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-mono font-semibold text-ink-900">
                      {total.booked}/{total.capacity}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {dates.length > 0 && (
            <tfoot>
              <tr className="whitespace-nowrap border-t border-line-strong bg-paper font-mono text-xs text-ink-700">
                <td className="px-3 py-2 font-medium text-ink-900">합계</td>
                {tourColumns.map((t) => {
                  const total = columnTotal(t.id);
                  return (
                    <td key={t.id} className="px-3 py-2 text-center font-semibold text-ink-900">
                      {total.booked}/{total.capacity}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-semibold text-ink-900">
                  {grandTotal.booked}/{grandTotal.capacity}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
