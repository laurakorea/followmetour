"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import {
  ADDED_RESERVATIONS_STORAGE_KEY,
  ADDED_SCHEDULES_STORAGE_KEY,
  GUIDE_CURRENT_NAME_STORAGE_KEY,
  GUIDE_NAMES,
  RESERVATION_EDITS_STORAGE_KEY,
  SAMPLE_RESERVATIONS,
  SAMPLE_SCHEDULES,
  SCHEDULE_CAPACITY_STORAGE_KEY,
  SCHEDULE_GUIDES_STORAGE_KEY,
  type AttendanceMark,
  type Reservation,
  type ReservationStatus,
  type Schedule,
} from "@/lib/sample-data";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
// 관리자 캘린더와 맞춘 목업 기준일. 인증·실데이터 연결 전까지 고정값.
const MOCK_TODAY = { year: 2026, month: 8, day: 17 }; // month은 0-indexed (8 = 9월)
const CANCELLED_STATUSES: ReservationStatus[] = ["cancelled"];

// 관리자 일정 화면(admin/schedule)이 쓰는 것과 같은 키 — 거기서는 파일 안
// 지역 상수라 그대로 못 불러와서 값만 맞춰 복사해뒀다. 명단·정산·현장지불금
// 내역을 가이드도 같이 보고 직접 쓸 수 있도록, 같은 localStorage를 공유한다.
const SETTLED_STORAGE_KEY = "fmt-admin-schedule-settled";
const ATTENDANCE_STORAGE_KEY = "fmt-admin-schedule-attendance";
const ONSITE_CASH_STORAGE_KEY = "fmt-admin-schedule-onsite-cash";
const TICKET_TRANSFER_STORAGE_KEY = "fmt-admin-schedule-ticket-transfer";
const OTHER_TRANSFER_STORAGE_KEY = "fmt-admin-schedule-other-transfer";
const SCHEDULE_SETTLED_STORAGE_KEY = "fmt-admin-schedule-day-settled";
const TICKET_ITEMS_STORAGE_KEY = "fmt-admin-schedule-tickets";
const TEAMS_STORAGE_KEY = "fmt-admin-schedule-teams";
const RESERVATION_TEAM_STORAGE_KEY = "fmt-admin-schedule-reservation-team";

type MiscItem = { label: string; amount: string };
const EMPTY_MISC_ITEM: MiscItem = { label: "", amount: "" };

// 구엘공원 등 "티켓 구매 확인" 체크리스트는 관리자만 관리한다 — 가이드는
// 캘린더의 🎫 표시로 상태만 확인하고, 체크리스트 자체는 볼 필요 없다
// (2026-09-13 확인). ticketItems는 그 🎫 표시 계산에만 쓴다.
type TicketItem = { label: string; checked: boolean; note: string };

const RESERVATION_STATUS_LABEL: Record<ReservationStatus, { label: string; tone: "good" | "warn" | "critical" | "neutral" }> = {
  pending: { label: "입금대기", tone: "warn" },
  confirmed: { label: "예약완료", tone: "good" },
  completed: { label: "투어완료", tone: "good" },
  cancelled: { label: "예약취소", tone: "critical" },
};

function moneyKey(scheduleId: string, teamIndex: number | null) {
  return teamIndex === null ? scheduleId : `${scheduleId}::team${teamIndex}`;
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildMonthCells(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, i) => {
    const date = new Date(year, month, i - firstWeekday + 1);
    return { date, inMonth: date.getMonth() === month };
  });
}

export default function GuideSchedulePage() {
  const [hydrated, setHydrated] = useState(false);
  const [currentGuide, setCurrentGuide] = useState(GUIDE_NAMES[0] ?? "");
  const [viewYear, setViewYear] = useState(MOCK_TODAY.year);
  const [viewMonth, setViewMonth] = useState(MOCK_TODAY.month);
  const [openRosterScheduleId, setOpenRosterScheduleId] = useState<string | null>(null);

  const [addedSchedules, setAddedSchedules] = useState<Schedule[]>([]);
  const [guideAssignments, setGuideAssignments] = useState<Record<string, string[]>>({});
  const [capacityOverrides, setCapacityOverrides] = useState<Record<string, number>>({});
  const [addedReservations, setAddedReservations] = useState<Reservation[]>([]);
  const [reservationEdits, setReservationEdits] = useState<Record<string, Reservation>>({});
  const [scheduleSettled, setScheduleSettled] = useState<Record<string, boolean>>({});
  const [ticketItems, setTicketItems] = useState<Record<string, TicketItem[]>>({});
  const [settledOverrides, setSettledOverrides] = useState<Record<string, boolean>>({});
  const [attendanceOverrides, setAttendanceOverrides] = useState<Record<string, AttendanceMark>>({});
  const [onsiteCash, setOnsiteCash] = useState<Record<string, MiscItem[]>>({});
  const [ticketTransfer, setTicketTransfer] = useState<Record<string, MiscItem[]>>({});
  const [otherTransfer, setOtherTransfer] = useState<Record<string, MiscItem[]>>({});
  const [teamNames, setTeamNames] = useState<Record<string, string[]>>({});
  const [reservationTeam, setReservationTeam] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const savedGuide = localStorage.getItem(GUIDE_CURRENT_NAME_STORAGE_KEY);
      if (savedGuide) setCurrentGuide(savedGuide);
      const savedAddedSchedules = localStorage.getItem(ADDED_SCHEDULES_STORAGE_KEY);
      if (savedAddedSchedules) setAddedSchedules(JSON.parse(savedAddedSchedules));
      const savedGuideAssignments = localStorage.getItem(SCHEDULE_GUIDES_STORAGE_KEY);
      if (savedGuideAssignments) setGuideAssignments(JSON.parse(savedGuideAssignments));
      const savedCapacity = localStorage.getItem(SCHEDULE_CAPACITY_STORAGE_KEY);
      if (savedCapacity) setCapacityOverrides(JSON.parse(savedCapacity));
      const savedAddedReservations = localStorage.getItem(ADDED_RESERVATIONS_STORAGE_KEY);
      if (savedAddedReservations) setAddedReservations(JSON.parse(savedAddedReservations));
      const savedReservationEdits = localStorage.getItem(RESERVATION_EDITS_STORAGE_KEY);
      if (savedReservationEdits) setReservationEdits(JSON.parse(savedReservationEdits));
      const savedScheduleSettled = localStorage.getItem(SCHEDULE_SETTLED_STORAGE_KEY);
      if (savedScheduleSettled) setScheduleSettled(JSON.parse(savedScheduleSettled));
      const savedTicketItems = localStorage.getItem(TICKET_ITEMS_STORAGE_KEY);
      if (savedTicketItems) setTicketItems(JSON.parse(savedTicketItems));
      const savedSettled = localStorage.getItem(SETTLED_STORAGE_KEY);
      if (savedSettled) setSettledOverrides(JSON.parse(savedSettled));
      const savedAttendance = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      if (savedAttendance) setAttendanceOverrides(JSON.parse(savedAttendance));
      const savedOnsiteCash = localStorage.getItem(ONSITE_CASH_STORAGE_KEY);
      if (savedOnsiteCash) setOnsiteCash(JSON.parse(savedOnsiteCash));
      const savedTicketTransfer = localStorage.getItem(TICKET_TRANSFER_STORAGE_KEY);
      if (savedTicketTransfer) setTicketTransfer(JSON.parse(savedTicketTransfer));
      const savedOtherTransfer = localStorage.getItem(OTHER_TRANSFER_STORAGE_KEY);
      if (savedOtherTransfer) setOtherTransfer(JSON.parse(savedOtherTransfer));
      const savedTeamNames = localStorage.getItem(TEAMS_STORAGE_KEY);
      if (savedTeamNames) setTeamNames(JSON.parse(savedTeamNames));
      const savedReservationTeam = localStorage.getItem(RESERVATION_TEAM_STORAGE_KEY);
      if (savedReservationTeam) setReservationTeam(JSON.parse(savedReservationTeam));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 표본 데이터만으로 계속 진행
    }
    setHydrated(true);
  }, []);

  // 아래 오버라이드들은 관리자 일정 화면과 이 화면이 같은 localStorage 키를
  // 공유해서 서로 바로 반영된다 — 하나씩 저장 이펙트를 건다.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SCHEDULE_SETTLED_STORAGE_KEY, JSON.stringify(scheduleSettled));
    } catch {}
  }, [scheduleSettled, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTLED_STORAGE_KEY, JSON.stringify(settledOverrides));
    } catch {}
  }, [settledOverrides, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendanceOverrides));
    } catch {}
  }, [attendanceOverrides, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ONSITE_CASH_STORAGE_KEY, JSON.stringify(onsiteCash));
    } catch {}
  }, [onsiteCash, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(TICKET_TRANSFER_STORAGE_KEY, JSON.stringify(ticketTransfer));
    } catch {}
  }, [ticketTransfer, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(OTHER_TRANSFER_STORAGE_KEY, JSON.stringify(otherTransfer));
    } catch {}
  }, [otherTransfer, hydrated]);
  const allSchedules = useMemo(() => [...SAMPLE_SCHEDULES, ...addedSchedules], [addedSchedules]);
  const allReservations = useMemo(
    () => [...SAMPLE_RESERVATIONS, ...addedReservations].map((r) => reservationEdits[r.id] ?? r),
    [addedReservations, reservationEdits],
  );

  function getAssignedGuides(schedule: Schedule) {
    return guideAssignments[schedule.id] ?? schedule.guideNames;
  }

  function getCapacity(schedule: Schedule) {
    return capacityOverrides[schedule.id] ?? schedule.capacity;
  }

  const bookedHeadcount = (scheduleId: string) =>
    allReservations
      .filter((r) => r.scheduleId === scheduleId && !CANCELLED_STATUSES.includes(r.status))
      .reduce((sum, r) => sum + r.headcount, 0);

  const getRoster = (scheduleId: string) => allReservations.filter((r) => r.scheduleId === scheduleId);

  function getSettled(reservation: Reservation) {
    return settledOverrides[reservation.id] ?? reservation.settled;
  }

  function toggleSettled(reservation: Reservation) {
    setSettledOverrides((prev) => ({ ...prev, [reservation.id]: !getSettled(reservation) }));
  }

  function getAttendance(reservation: Reservation) {
    return attendanceOverrides[reservation.id] ?? reservation.attended ?? "yes";
  }

  function setAttendance(reservationId: string, mark: AttendanceMark) {
    setAttendanceOverrides((prev) => ({ ...prev, [reservationId]: mark }));
  }

  function settleAllInRoster(scheduleId: string) {
    const activeIds = getRoster(scheduleId)
      .filter((r) => !CANCELLED_STATUSES.includes(r.status))
      .map((r) => r.id);
    setSettledOverrides((prev) => {
      const next = { ...prev };
      for (const id of activeIds) next[id] = true;
      return next;
    });
    // 정산하기는 가이드가 그날 투어를 다 마감했다는 뜻 — 캘린더에서 바로 보이게 표시한다.
    setScheduleSettled((prev) => ({ ...prev, [scheduleId]: true }));
  }

  function hasCheckedTicket(scheduleId: string) {
    return (ticketItems[scheduleId] ?? []).some((item) => item.checked);
  }

  // 팀 나누기·이름 수정·인원 이동은 관리자 전용 — 가이드는 관리자가 이미
  // 나눠둔 팀 구성을 읽기만 한다(2026-09-13 확인).
  function getTeams(scheduleId: string): string[] | null {
    return teamNames[scheduleId] ?? null;
  }

  function getReservationTeamIndex(reservationId: string) {
    return reservationTeam[reservationId] ?? 0;
  }

  function getMiscItems(store: Record<string, MiscItem[]>, scheduleId: string): MiscItem[] {
    const items = store[scheduleId];
    return items && items.length > 0 ? items : [EMPTY_MISC_ITEM];
  }

  function updateMiscItem(
    setter: (updater: (prev: Record<string, MiscItem[]>) => Record<string, MiscItem[]>) => void,
    scheduleId: string,
    index: number,
    field: keyof MiscItem,
    value: string,
  ) {
    setter((prev) => {
      const current = getMiscItems(prev, scheduleId);
      const next = current.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      return { ...prev, [scheduleId]: next };
    });
  }

  function addMiscItem(
    setter: (updater: (prev: Record<string, MiscItem[]>) => Record<string, MiscItem[]>) => void,
    scheduleId: string,
  ) {
    setter((prev) => ({ ...prev, [scheduleId]: [...getMiscItems(prev, scheduleId), { ...EMPTY_MISC_ITEM }] }));
  }

  function removeMiscItem(
    setter: (updater: (prev: Record<string, MiscItem[]>) => Record<string, MiscItem[]>) => void,
    scheduleId: string,
    index: number,
  ) {
    setter((prev) => {
      const current = getMiscItems(prev, scheduleId);
      if (current.length <= 1) return prev;
      return { ...prev, [scheduleId]: current.filter((_, i) => i !== index) };
    });
  }

  // 내가 배정된 스케줄만 날짜별로 묶는다 — 관리자 일정 화면과 같은 배정
  // 데이터를 읽되, 이 화면엔 내 것만 보인다.
  const mySchedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const s of allSchedules) {
      if (!getAssignedGuides(s).includes(currentGuide)) continue;
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSchedules, guideAssignments, currentGuide]);

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function goToToday() {
    setViewYear(MOCK_TODAY.year);
    setViewMonth(MOCK_TODAY.month);
  }

  const rosterSchedule = allSchedules.find((s) => s.id === openRosterScheduleId) ?? null;

  function renderRosterTable(reservations: Reservation[]) {
    if (reservations.length === 0) {
      return <p className="p-4 text-sm text-ink-500">예약자가 없습니다.</p>;
    }
    return (
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="whitespace-nowrap bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
            <th className="px-3 py-2 font-medium">이름(인원)</th>
            <th className="px-3 py-2 font-medium">사전예약금(₩)</th>
            <th className="px-3 py-2 font-medium">현장지불금(€)</th>
            <th className="px-3 py-2 font-medium">연락처</th>
            <th className="px-3 py-2 font-medium">채널</th>
            <th className="px-3 py-2 font-medium">등록일</th>
            <th className="px-3 py-2 font-medium">상태</th>
            <th className="px-3 py-2 font-medium">정산</th>
            <th className="px-3 py-2 font-medium">참여</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => {
            const status = RESERVATION_STATUS_LABEL[r.status];
            const settled = getSettled(r);
            const attendance = getAttendance(r);
            return (
              <tr key={r.id} className="whitespace-nowrap border-t border-line">
                <td className="px-3 py-2 text-ink-900">
                  {r.contactName} <span className="text-ink-500">({r.headcount}명)</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-700">
                  ₩{r.advanceDepositKrw.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-700">€{r.onSitePaymentEur.toFixed(1)}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-700">{r.phone}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-700">
                  {r.channel === "partner_agency" ? r.partnerName : "자사"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-500">{r.registeredAt}</td>
                <td className="px-3 py-2">
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                </td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => toggleSettled(r)}>
                    <StatusPill tone={settled ? "good" : "neutral"}>{settled ? "정산완료" : "미정산"}</StatusPill>
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setAttendance(r.id, attendance === "yes" ? null : "yes")}
                      aria-label="참여"
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                        attendance === "yes" ? "border-good bg-good-wash text-good" : "border-line text-ink-500 hover:bg-paper"
                      }`}
                    >
                      O
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendance(r.id, attendance === "no" ? null : "no")}
                      aria-label="불참"
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                        attendance === "no" ? "border-critical bg-critical-wash text-critical" : "border-line text-ink-500 hover:bg-paper"
                      }`}
                    >
                      X
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="whitespace-nowrap border-t border-line-strong bg-paper font-mono text-xs text-ink-700">
            <td className="px-3 py-2 font-medium text-ink-900">
              합계 ({reservations.reduce((sum, r) => sum + r.headcount, 0)}명)
            </td>
            <td className="px-3 py-2">₩{reservations.reduce((sum, r) => sum + r.advanceDepositKrw, 0).toLocaleString()}</td>
            <td className="px-3 py-2">€{reservations.reduce((sum, r) => sum + r.onSitePaymentEur, 0).toFixed(1)}</td>
            <td colSpan={6}></td>
          </tr>
        </tfoot>
      </table>
    );
  }

  function renderPaymentBreakdown(key: string, teamLabel?: string) {
    function renderRows(store: Record<string, MiscItem[]>, setter: typeof setOnsiteCash) {
      const items = getMiscItems(store, key);
      return (
        <>
          <div className="mt-1.5 flex flex-col gap-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 rounded-sm border border-line p-2">
                <span className="mt-1.5 w-4 text-xs text-ink-500">{idx + 1}</span>
                <div className="flex flex-1 flex-col gap-1.5">
                  <input
                    value={item.label}
                    onChange={(e) => updateMiscItem(setter, key, idx, "label", e.target.value)}
                    placeholder="항목 (예: 로컬비)"
                    className="rounded-sm border border-line px-2 py-1 text-sm focus:border-line-strong focus:outline-none"
                  />
                  <input
                    value={item.amount}
                    onChange={(e) => updateMiscItem(setter, key, idx, "amount", e.target.value)}
                    placeholder="금액"
                    inputMode="numeric"
                    className="rounded-sm border border-line px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMiscItem(setter, key, idx)}
                    aria-label="항목 삭제"
                    className="mt-1.5 text-ink-500 hover:text-critical"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addMiscItem(setter, key)}
            className="mt-2 rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
          >
            추가하기
          </button>
        </>
      );
    }

    const ticketSum = getMiscItems(ticketTransfer, key).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const otherSum = getMiscItems(otherTransfer, key).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return (
      <div className="mt-3 border-t border-line pt-3">
        <p className="text-sm font-semibold text-ink-900">
          현장지불금 결제 수단별 내역{teamLabel ? ` · ${teamLabel}` : ""}
        </p>
        <p className="text-xs text-ink-500">손님이 현장지불금을 현금이 아니라 계좌이체로 낸 경우, 이체 목적별로 나눠 적는다.</p>

        <div className="mt-3">
          <p className="text-xs font-medium text-ink-900">기타</p>
          {renderRows(onsiteCash, setOnsiteCash)}
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-ink-900">티켓비이체</p>
          {renderRows(ticketTransfer, setTicketTransfer)}
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-ink-900">기타이체</p>
          {renderRows(otherTransfer, setOtherTransfer)}
        </div>

        <p className="mt-3 text-xs text-ink-500">
          티켓비이체 합계 €{ticketSum.toFixed(1)} · 기타이체 합계 €{otherSum.toFixed(1)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <a href="/guide" className="text-xs text-ink-500 hover:text-rose-700">
        ← 오늘 일정으로
      </a>
      <h1 className="font-display text-lg text-ink-900">내 일정 달력</h1>
      <p className="text-xs text-ink-500">
        {currentGuide}님으로 로그인됨 · 내가 배정된 투어만 보입니다 · 초록 ✓ 정산완료 · 주황 🎫 입장권 구매 확인
      </p>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          aria-label="이전 달"
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-700"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-ink-900">
            {viewYear}. {viewMonth + 1}.
          </span>
          <button type="button" onClick={goToToday} className="rounded-sm border border-line px-2 py-0.5 text-xs text-ink-700">
            오늘
          </button>
        </div>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          aria-label="다음 달"
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-700"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-line bg-line text-center">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="bg-paper py-1 text-[11px] text-ink-500">
            {w}
          </div>
        ))}
        {cells.map(({ date, inMonth }, i) => {
          const key = dateKey(date.getFullYear(), date.getMonth(), date.getDate());
          const daySchedules = mySchedulesByDate.get(key) ?? [];
          const isToday = key === dateKey(MOCK_TODAY.year, MOCK_TODAY.month, MOCK_TODAY.day);
          return (
            <div key={i} className={`flex min-h-[64px] flex-col gap-0.5 p-0.5 text-left ${inMonth ? "bg-surface" : "bg-paper"}`}>
              <span
                className={`px-0.5 text-right font-mono text-[10px] ${
                  isToday ? "font-semibold text-rose-700" : inMonth ? "text-ink-700" : "text-ink-500"
                }`}
              >
                {date.getDate()}
              </span>
              {daySchedules.map((s) => {
                const isSettled = scheduleSettled[s.id] ?? false;
                const ticketReady = hasCheckedTicket(s.id);
                const tone = isSettled ? "good" : ticketReady ? "warn" : null;
                const assignedGuides = getAssignedGuides(s);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setOpenRosterScheduleId(s.id)}
                    className={`rounded-sm border px-1 py-0.5 text-left leading-tight ${
                      tone === "good" ? "border-good bg-good-wash" : tone === "warn" ? "border-warn bg-warn-wash" : "border-line bg-paper"
                    }`}
                  >
                    <p className="text-[9px] font-medium text-ink-900">
                      {s.tourName} {tone === "good" && <span className="text-good">✓</span>}
                      {tone === "warn" && <span className="text-warn">🎫</span>}
                    </p>
                    <p
                      className={`font-mono text-[8px] ${
                        tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-ink-500"
                      }`}
                    >
                      ({bookedHeadcount(s.id)}/{getCapacity(s)})
                      {assignedGuides.length > 1 && ` ${assignedGuides.filter((g) => g !== currentGuide).join(", ")}`}
                    </p>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {rosterSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setOpenRosterScheduleId(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-y-auto rounded-md bg-surface p-5 shadow-[0_1px_2px_rgba(28,29,36,0.06),0_6px_20px_-10px_rgba(28,29,36,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-base font-semibold text-ink-900">예약자 명단</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => settleAllInRoster(rosterSchedule.id)}
                  className="rounded-sm bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700"
                >
                  정산하기
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-sm border border-line px-2.5 py-1 text-xs text-ink-700 hover:bg-paper"
                >
                  출력하기
                </button>
                <button
                  type="button"
                  onClick={() => setOpenRosterScheduleId(null)}
                  aria-label="명단 닫기"
                  className="text-ink-500 hover:text-ink-700"
                >
                  ✕
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-ink-700">
              {rosterSchedule.tourName} · {rosterSchedule.date}
            </p>
            <p className="text-xs text-ink-500">
              예약 {getRoster(rosterSchedule.id).length}건 · 총 {bookedHeadcount(rosterSchedule.id)}명(취소 제외) · 결제
              금액은 예시 데이터입니다
            </p>

            {(() => {
              const teams = getTeams(rosterSchedule.id);
              const roster = getRoster(rosterSchedule.id);

              if (!teams) {
                return (
                  <>
                    <div className="mt-2 shrink-0 overflow-x-auto rounded-md border border-line">{renderRosterTable(roster)}</div>
                    {renderPaymentBreakdown(moneyKey(rosterSchedule.id, null))}
                  </>
                );
              }

              return (
                <div className="mt-2 flex flex-col gap-4">
                  {teams.map((teamName, index) => {
                    const teamReservations = roster.filter((r) => getReservationTeamIndex(r.id) === index);
                    return (
                      <div key={index}>
                        <div className="mb-1.5 flex items-center gap-2">
                          <p className="text-sm font-medium text-ink-900">{teamName}</p>
                          <span className="text-xs text-ink-500">
                            {teamReservations.reduce((sum, r) => sum + r.headcount, 0)}명
                          </span>
                        </div>
                        <div className="overflow-x-auto rounded-md border border-line">{renderRosterTable(teamReservations)}</div>
                      </div>
                    );
                  })}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {teams.map((teamName, index) => (
                      <div key={index}>{renderPaymentBreakdown(moneyKey(rosterSchedule.id, index), teamName)}</div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setOpenRosterScheduleId(null)}
              className="mt-3 rounded-sm border border-line py-2 text-sm text-ink-700 hover:bg-paper"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
