"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import {
  ADDED_RESERVATIONS_STORAGE_KEY,
  ADDED_SCHEDULES_STORAGE_KEY,
  ASSIGNABLE_GUIDES,
  RESERVATION_EDITS_STORAGE_KEY,
  SAMPLE_RESERVATIONS,
  SAMPLE_SCHEDULES,
  SAMPLE_TOURS,
  type AttendanceMark,
  type Reservation,
  type ReservationStatus,
  type Schedule,
} from "@/lib/sample-data";

type MiscItem = { label: string; amount: string };
const EMPTY_MISC_ITEM: MiscItem = { label: "", amount: "" };

type TicketItem = { label: string; checked: boolean; note: string };
const DEFAULT_TICKET_ITEMS: TicketItem[] = [{ label: "구엘공원", checked: false, note: "" }];

// 나눠 산 표 개수를 자유 텍스트로 적으면(예: "20+10") 그 안의 숫자를 전부
// 더해서 합계를 자동으로 보여준다 — 몇 번에 나눠 샀든 상관없이.
// 팀이 나뉜 스케줄은 팀마다 가이드가 따로 돈을 받으니, 결제 내역을 스케줄
// 하나가 아니라 "스케줄+팀"별로 따로 저장한다. 팀이 없으면(teamIndex null)
// 그냥 스케줄 id 그대로 쓴다.
function moneyKey(scheduleId: string, teamIndex: number | null) {
  return teamIndex === null ? scheduleId : `${scheduleId}::team${teamIndex}`;
}

function sumTicketNote(note: string) {
  const numbers = note.match(/\d+(\.\d+)?/g);
  if (!numbers) return 0;
  return numbers.reduce((sum, n) => sum + parseFloat(n), 0);
}

// 예약 페이지(admin/reservations)와 같은 상태 라벨 — 명단보기에서 같은 어휘로 보여준다.
const RESERVATION_STATUS_LABEL: Record<ReservationStatus, { label: string; tone: "good" | "warn" | "critical" | "neutral" }> = {
  pending: { label: "입금대기", tone: "warn" },
  confirmed: { label: "예약완료", tone: "good" },
  completed: { label: "투어완료", tone: "good" },
  cancelled: { label: "예약취소", tone: "critical" },
};

/**
 * 월간 캘린더 뷰. 칸 색상은 기존 스프레드시트 운영 방식을 참고했지만
 * (사용자 확인: "그냥 시각 구분용", 배정 상태 등의 의미 없음) 우리 시스템에서
 * 색은 상태 전용(DESIGN.md §5 "상태는 색으로 말한다")이라, 여기서는 임의
 * 색칠 대신 중립 톤 하나로 통일했다. 요일 칸별 색 구분이 필요해지면
 * 그 의미를 먼저 정하고 --good/--warn/--critical과 겹치지 않는 새 토큰으로 추가할 것.
 */

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const CANCELLED_STATUSES: ReservationStatus[] = ["cancelled"];

// 대시보드 알림판("오늘 일정")과 맞춘 목업 기준일. 인증·실데이터 연결 전까지 고정값.
const MOCK_TODAY = { year: 2026, month: 8, day: 17 }; // month은 0-indexed (8 = 9월)

// Supabase 연결 전 임시 저장소. 이 브라우저에만 남고, 다른 직원·기기와는 공유되지 않는다.
const NOTES_STORAGE_KEY = "fmt-admin-schedule-notes";
const CHECKED_STORAGE_KEY = "fmt-admin-schedule-checked";
const GUIDES_STORAGE_KEY = "fmt-admin-schedule-guides";
const CAPACITY_STORAGE_KEY = "fmt-admin-schedule-capacity";
const SETTLED_STORAGE_KEY = "fmt-admin-schedule-settled";
const ATTENDANCE_STORAGE_KEY = "fmt-admin-schedule-attendance";
const ONSITE_CASH_STORAGE_KEY = "fmt-admin-schedule-onsite-cash";
const TICKET_TRANSFER_STORAGE_KEY = "fmt-admin-schedule-ticket-transfer";
const OTHER_TRANSFER_STORAGE_KEY = "fmt-admin-schedule-other-transfer";
const SCHEDULE_SETTLED_STORAGE_KEY = "fmt-admin-schedule-day-settled";
const TICKET_ITEMS_STORAGE_KEY = "fmt-admin-schedule-tickets";
const TEAMS_STORAGE_KEY = "fmt-admin-schedule-teams";
const RESERVATION_TEAM_STORAGE_KEY = "fmt-admin-schedule-reservation-team";

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

export default function AdminSchedulePage() {
  const [viewYear, setViewYear] = useState(MOCK_TODAY.year);
  const [viewMonth, setViewMonth] = useState(MOCK_TODAY.month);
  // 예약 페이지의 "추가하기"/행 클릭 수정으로 생긴 예약·수정 내역. 같은
  // localStorage 키를 읽기만 한다 — 쓰기는 예약 페이지 쪽에서만 한다.
  const [addedReservations, setAddedReservations] = useState<Reservation[]>([]);
  const [reservationEdits, setReservationEdits] = useState<Record<string, Reservation>>({});
  // 관리자가 캘린더 빈 날짜에서 "투어 오픈"으로 만든 스케줄.
  const [addedSchedules, setAddedSchedules] = useState<Schedule[]>([]);
  // 투어 오픈 창 상태 — null이면 닫힘, 날짜 문자열이면 그 날짜용 오픈 창이 열림.
  const [openTourDate, setOpenTourDate] = useState<string | null>(null);
  const [newTourForm, setNewTourForm] = useState<{ tourId: string; capacity: string; startTime: string; guides: string[] }>({
    tourId: SAMPLE_TOURS[0]?.id ?? "",
    capacity: "20",
    startTime: "09:00",
    guides: ["관리자"],
  });
  // 메모·체크는 아직 Supabase가 없어 이 브라우저의 localStorage에만 저장한다.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  // scheduleId -> 배정된 가이드 이름 목록. 없으면 SAMPLE_SCHEDULES의 기본값(["관리자"])을 쓴다.
  const [guideAssignments, setGuideAssignments] = useState<Record<string, string[]>>({});
  // scheduleId -> 정원(관리자가 직접 고친 값). 없으면 SAMPLE_SCHEDULES의 기본 정원을 쓴다.
  const [capacityOverrides, setCapacityOverrides] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);

  // 배정 모달 상태
  const [openScheduleId, setOpenScheduleId] = useState<string | null>(null);
  const [draftGuides, setDraftGuides] = useState<string[]>([]);
  const [draftAvailable, setDraftAvailable] = useState(0);
  // 명단보기는 배정 창 위에 별도 창으로 뜬다(배정 창은 뒤에 그대로 유지).
  const [rosterScheduleId, setRosterScheduleId] = useState<string | null>(null);
  // reservationId -> 정산/참여 상태(관리자가 명단보기 창에서 직접 고친 값).
  const [settledOverrides, setSettledOverrides] = useState<Record<string, boolean>>({});
  const [attendanceOverrides, setAttendanceOverrides] = useState<Record<string, AttendanceMark>>({});
  // 키 -> 현장지불금을 현금/티켓비이체/기타이체로 나눠 받은 내역. 팀이 나뉜
  // 스케줄은 팀마다 가이드가 따로 받기 때문에, 키를 scheduleId 하나가 아니라
  // "scheduleId::team{index}"로 나눠서 팀별로 따로 기록한다(moneyKey 참고).
  // (2026-09-12 확인: 현장에서 카드·현금 대신 이체로 내는 손님이 있어서
  // 결제 수단별로 나눠 기록한다 — 이전의 "기타 수입/지출" 칸을 대체.)
  const [onsiteCash, setOnsiteCash] = useState<Record<string, MiscItem[]>>({});
  const [ticketTransfer, setTicketTransfer] = useState<Record<string, MiscItem[]>>({});
  const [otherTransfer, setOtherTransfer] = useState<Record<string, MiscItem[]>>({});
  // scheduleId -> 가이드가 "정산하기"를 눌렀는지. 캘린더 칸을 초록색으로 바꾸는 용도.
  const [scheduleSettled, setScheduleSettled] = useState<Record<string, boolean>>({});
  // scheduleId -> 그날 사야 하는 입장권 체크리스트(구엘공원 등). 하나라도
  // 체크되면 캘린더 칸이 주황색으로 바뀐다.
  const [ticketItems, setTicketItems] = useState<Record<string, TicketItem[]>>({});
  // scheduleId -> 팀 이름 목록. 없으면 "나뉘지 않은 하나의 명단"으로 취급한다
  // (가우디 마스터패스처럼 버스/가이드가 둘로 나뉘는 투어에서만 켜서 쓰는 용도).
  const [teamNames, setTeamNames] = useState<Record<string, string[]>>({});
  // reservationId -> 그 예약이 속한 팀의 인덱스. 없으면 0(첫 번째 팀).
  const [reservationTeam, setReservationTeam] = useState<Record<string, number>>({});
  // 드래그는 셀 안 텍스트(연락처 등)를 복사하려는 클릭과 부딪혀서 뺐다 — 대신
  // 체크박스로 여러 명을 골라 "이 팀으로 옮기기" 버튼 한 번에 옮긴다.
  const [selectedReservationIds, setSelectedReservationIds] = useState<Set<string>>(new Set());
  // 표본 스케줄 + "투어 오픈"으로 새로 만든 스케줄을 합친 전체 목록.
  const allSchedules = useMemo(() => [...SAMPLE_SCHEDULES, ...addedSchedules], [addedSchedules]);
  const openSchedule = allSchedules.find((s) => s.id === openScheduleId) ?? null;
  const rosterSchedule = allSchedules.find((s) => s.id === rosterScheduleId) ?? null;

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
      const savedChecked = localStorage.getItem(CHECKED_STORAGE_KEY);
      const savedGuides = localStorage.getItem(GUIDES_STORAGE_KEY);
      const savedCapacity = localStorage.getItem(CAPACITY_STORAGE_KEY);
      const savedSettled = localStorage.getItem(SETTLED_STORAGE_KEY);
      const savedAttendance = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      const savedMiscIncome = localStorage.getItem(ONSITE_CASH_STORAGE_KEY);
      const savedMiscExpense = localStorage.getItem(TICKET_TRANSFER_STORAGE_KEY);
      const savedOtherTransfer = localStorage.getItem(OTHER_TRANSFER_STORAGE_KEY);
      const savedScheduleSettled = localStorage.getItem(SCHEDULE_SETTLED_STORAGE_KEY);
      const savedTicketItems = localStorage.getItem(TICKET_ITEMS_STORAGE_KEY);
      const savedTeamNames = localStorage.getItem(TEAMS_STORAGE_KEY);
      const savedReservationTeam = localStorage.getItem(RESERVATION_TEAM_STORAGE_KEY);
      const savedAddedReservations = localStorage.getItem(ADDED_RESERVATIONS_STORAGE_KEY);
      const savedReservationEdits = localStorage.getItem(RESERVATION_EDITS_STORAGE_KEY);
      const savedAddedSchedules = localStorage.getItem(ADDED_SCHEDULES_STORAGE_KEY);
      if (savedAddedSchedules) setAddedSchedules(JSON.parse(savedAddedSchedules));
      if (savedAddedReservations) setAddedReservations(JSON.parse(savedAddedReservations));
      if (savedReservationEdits) setReservationEdits(JSON.parse(savedReservationEdits));
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedChecked) setChecked(JSON.parse(savedChecked));
      if (savedGuides) setGuideAssignments(JSON.parse(savedGuides));
      if (savedCapacity) setCapacityOverrides(JSON.parse(savedCapacity));
      if (savedSettled) setSettledOverrides(JSON.parse(savedSettled));
      if (savedAttendance) setAttendanceOverrides(JSON.parse(savedAttendance));
      if (savedMiscIncome) setOnsiteCash(JSON.parse(savedMiscIncome));
      if (savedMiscExpense) setTicketTransfer(JSON.parse(savedMiscExpense));
      if (savedOtherTransfer) setOtherTransfer(JSON.parse(savedOtherTransfer));
      if (savedScheduleSettled) setScheduleSettled(JSON.parse(savedScheduleSettled));
      if (savedTicketItems) setTicketItems(JSON.parse(savedTicketItems));
      if (savedTeamNames) setTeamNames(JSON.parse(savedTeamNames));
      if (savedReservationTeam) setReservationTeam(JSON.parse(savedReservationTeam));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 빈 상태로 계속 진행
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [notes, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ADDED_SCHEDULES_STORAGE_KEY, JSON.stringify(addedSchedules));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [addedSchedules, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CHECKED_STORAGE_KEY, JSON.stringify(checked));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [checked, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(GUIDES_STORAGE_KEY, JSON.stringify(guideAssignments));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [guideAssignments, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CAPACITY_STORAGE_KEY, JSON.stringify(capacityOverrides));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [capacityOverrides, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTLED_STORAGE_KEY, JSON.stringify(settledOverrides));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [settledOverrides, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendanceOverrides));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [attendanceOverrides, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ONSITE_CASH_STORAGE_KEY, JSON.stringify(onsiteCash));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [onsiteCash, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(TICKET_TRANSFER_STORAGE_KEY, JSON.stringify(ticketTransfer));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [ticketTransfer, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(OTHER_TRANSFER_STORAGE_KEY, JSON.stringify(otherTransfer));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [otherTransfer, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SCHEDULE_SETTLED_STORAGE_KEY, JSON.stringify(scheduleSettled));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [scheduleSettled, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(TICKET_ITEMS_STORAGE_KEY, JSON.stringify(ticketItems));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [ticketItems, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teamNames));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [teamNames, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(RESERVATION_TEAM_STORAGE_KEY, JSON.stringify(reservationTeam));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [reservationTeam, hydrated]);

  // teamNames에 항목이 없으면 "나뉘지 않음" — 명단 하나로 합쳐서 보여준다.
  function getTeams(scheduleId: string): string[] | null {
    return teamNames[scheduleId] ?? null;
  }

  function splitIntoTeams(scheduleId: string) {
    setTeamNames((prev) => ({ ...prev, [scheduleId]: ["1팀", "2팀"] }));
  }

  function mergeTeams(scheduleId: string) {
    setTeamNames((prev) => {
      const next = { ...prev };
      delete next[scheduleId];
      return next;
    });
  }

  function renameTeam(scheduleId: string, index: number, name: string) {
    setTeamNames((prev) => {
      const current = prev[scheduleId] ?? ["1팀", "2팀"];
      return { ...prev, [scheduleId]: current.map((n, i) => (i === index ? name : n)) };
    });
  }

  function addTeam(scheduleId: string) {
    setTeamNames((prev) => {
      const current = prev[scheduleId] ?? ["1팀", "2팀"];
      return { ...prev, [scheduleId]: [...current, `${current.length + 1}팀`] };
    });
  }

  function removeTeam(scheduleId: string, index: number) {
    setTeamNames((prev) => {
      const current = prev[scheduleId] ?? ["1팀", "2팀"];
      if (current.length <= 1) return prev; // 최소 1팀은 남긴다
      return { ...prev, [scheduleId]: current.filter((_, i) => i !== index) };
    });
    // 그 팀에 있던 예약은 앞 팀으로 당겨온다.
    setReservationTeam((prev) => {
      const next: Record<string, number> = {};
      for (const [rid, idx] of Object.entries(prev)) {
        if (idx === index) next[rid] = 0;
        else if (idx > index) next[rid] = idx - 1;
        else next[rid] = idx;
      }
      return next;
    });
  }

  function getReservationTeamIndex(reservationId: string) {
    return reservationTeam[reservationId] ?? 0;
  }

  function toggleReservationSelected(reservationId: string) {
    setSelectedReservationIds((prev) => {
      const next = new Set(prev);
      if (next.has(reservationId)) next.delete(reservationId);
      else next.add(reservationId);
      return next;
    });
  }

  function moveSelectedToTeam(teamIndex: number) {
    setReservationTeam((prev) => {
      const next = { ...prev };
      for (const id of selectedReservationIds) next[id] = teamIndex;
      return next;
    });
    setSelectedReservationIds(new Set());
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
      if (current.length <= 1) return prev; // 최소 1줄은 남긴다
      return { ...prev, [scheduleId]: current.filter((_, i) => i !== index) };
    });
  }

  function getTicketItems(scheduleId: string): TicketItem[] {
    const items = ticketItems[scheduleId];
    return items && items.length > 0 ? items : DEFAULT_TICKET_ITEMS;
  }

  function hasCheckedTicket(scheduleId: string) {
    return getTicketItems(scheduleId).some((item) => item.checked);
  }

  function updateTicketItem(scheduleId: string, index: number, field: keyof TicketItem, value: string | boolean) {
    setTicketItems((prev) => {
      const current = prev[scheduleId] && prev[scheduleId].length > 0 ? prev[scheduleId] : DEFAULT_TICKET_ITEMS;
      const next = current.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      return { ...prev, [scheduleId]: next };
    });
  }

  function addTicketItem(scheduleId: string) {
    setTicketItems((prev) => {
      const current = prev[scheduleId] && prev[scheduleId].length > 0 ? prev[scheduleId] : DEFAULT_TICKET_ITEMS;
      return { ...prev, [scheduleId]: [...current, { label: "", checked: false, note: "" }] };
    });
  }

  function removeTicketItem(scheduleId: string, index: number) {
    setTicketItems((prev) => {
      const current = prev[scheduleId] && prev[scheduleId].length > 0 ? prev[scheduleId] : DEFAULT_TICKET_ITEMS;
      if (current.length <= 1) return prev; // 최소 1줄은 남긴다
      return { ...prev, [scheduleId]: current.filter((_, i) => i !== index) };
    });
  }

  function getAssignedGuides(schedule: (typeof SAMPLE_SCHEDULES)[number]) {
    return guideAssignments[schedule.id] ?? schedule.guideNames;
  }

  function getCapacity(schedule: (typeof SAMPLE_SCHEDULES)[number]) {
    return capacityOverrides[schedule.id] ?? schedule.capacity;
  }

  function openAssignmentModal(schedule: (typeof SAMPLE_SCHEDULES)[number]) {
    setOpenScheduleId(schedule.id);
    setDraftGuides(getAssignedGuides(schedule));
    setDraftAvailable(getCapacity(schedule) - bookedHeadcount(schedule.id));
  }

  function openTourOpenModal(date: string, defaultTourId: string) {
    setNewTourForm({ tourId: defaultTourId, capacity: "20", startTime: "09:00", guides: ["관리자"] });
    setOpenTourDate(date);
  }

  function closeTourOpenModal() {
    setOpenTourDate(null);
  }

  function toggleNewTourGuide(name: string, isChecked: boolean) {
    setNewTourForm((prev) => ({
      ...prev,
      guides: isChecked ? [...prev.guides, name] : prev.guides.filter((n) => n !== name),
    }));
  }

  function submitTourOpen() {
    if (!openTourDate) return;
    const tour = SAMPLE_TOURS.find((t) => t.id === newTourForm.tourId);
    if (!tour) return;
    const capacity = Math.max(0, Math.round(Number(newTourForm.capacity)) || 0);
    const schedule: Schedule = {
      id: `${tour.id}-${openTourDate}`,
      tourId: tour.id,
      tourName: tour.name,
      date: openTourDate,
      startTime: newTourForm.startTime || "09:00",
      capacity,
      guideNames: newTourForm.guides.length > 0 ? newTourForm.guides : ["관리자"],
    };
    setAddedSchedules((prev) => [...prev, schedule]);
    closeTourOpenModal();
  }

  function closeAssignmentModal() {
    setOpenScheduleId(null);
  }

  // 표본 예약 3건 + 예약 페이지에서 새로 추가한 예약, 그리고 예약 페이지에서
  // 행을 눌러 고친 값(reservationEdits)까지 전부 겹쳐서 최종 목록을 만든다.
  const allReservations = useMemo(
    () => [...SAMPLE_RESERVATIONS, ...addedReservations].map((r) => reservationEdits[r.id] ?? r),
    [addedReservations, reservationEdits],
  );

  const bookedHeadcount = (scheduleId: string) =>
    allReservations
      .filter((r) => r.scheduleId === scheduleId && !CANCELLED_STATUSES.includes(r.status))
      .reduce((sum, r) => sum + r.headcount, 0);

  const getRoster = (scheduleId: string) => allReservations.filter((r) => r.scheduleId === scheduleId);

  function getSettled(reservation: (typeof SAMPLE_RESERVATIONS)[number]) {
    return settledOverrides[reservation.id] ?? reservation.settled;
  }

  function toggleSettled(reservation: (typeof SAMPLE_RESERVATIONS)[number]) {
    setSettledOverrides((prev) => ({ ...prev, [reservation.id]: !getSettled(reservation) }));
  }

  // 기본은 "참여(O)" — 가이드는 실제로 안 온 사람만 X로 뒤집으면 된다.
  function getAttendance(reservation: (typeof SAMPLE_RESERVATIONS)[number]) {
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

  function toggleDraftGuide(name: string, isChecked: boolean) {
    setDraftGuides((prev) => (isChecked ? [...prev, name] : prev.filter((n) => n !== name)));
  }

  function saveAssignment() {
    if (!openScheduleId || !openSchedule) return;
    setGuideAssignments((prev) => ({ ...prev, [openScheduleId]: draftGuides }));
    setCapacityOverrides((prev) => ({
      ...prev,
      [openScheduleId]: Math.max(0, draftAvailable) + bookedHeadcount(openSchedule.id),
    }));
    closeAssignmentModal();
  }

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const s of allSchedules) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [allSchedules]);

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayKey = dateKey(MOCK_TODAY.year, MOCK_TODAY.month, MOCK_TODAY.day);

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function goToToday() {
    setViewYear(MOCK_TODAY.year);
    setViewMonth(MOCK_TODAY.month);
  }

  // 팀으로 나뉘어 있으면(teams !== null) 팀 이동용 열을 하나 더 넣어서 표를 그린다.
  function renderRosterTable(reservations: typeof SAMPLE_RESERVATIONS, teams: string[] | null) {
    if (reservations.length === 0) {
      return <p className="p-4 text-sm text-ink-500">예약자가 없습니다.</p>;
    }
    return (
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="whitespace-nowrap bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
            {teams && <th className="px-3 py-2 font-medium">선택</th>}
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
                {teams && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedReservationIds.has(r.id)}
                      onChange={() => toggleReservationSelected(r.id)}
                      className="h-3.5 w-3.5 accent-rose-600"
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-ink-900">
                  {r.contactName} <span className="text-ink-500">({r.headcount}명)</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-700">
                  ₩{r.advanceDepositKrw.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-700">
                  €{r.onSitePaymentEur.toFixed(1)}
                </td>
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
                    <StatusPill tone={settled ? "good" : "neutral"}>
                      {settled ? "정산완료" : "미정산"}
                    </StatusPill>
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setAttendance(r.id, attendance === "yes" ? null : "yes")}
                      aria-label="참여"
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                        attendance === "yes"
                          ? "border-good bg-good-wash text-good"
                          : "border-line text-ink-500 hover:bg-paper"
                      }`}
                    >
                      O
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendance(r.id, attendance === "no" ? null : "no")}
                      aria-label="불참"
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                        attendance === "no"
                          ? "border-critical bg-critical-wash text-critical"
                          : "border-line text-ink-500 hover:bg-paper"
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
            <td className="px-3 py-2">
              ₩{reservations.reduce((sum, r) => sum + r.advanceDepositKrw, 0).toLocaleString()}
            </td>
            <td className="px-3 py-2">
              €{reservations.reduce((sum, r) => sum + r.onSitePaymentEur, 0).toFixed(1)}
            </td>
            <td colSpan={teams ? 7 : 6}></td>
          </tr>
        </tfoot>
      </table>
    );
  }

  // 팀이 나뉜 스케줄은 이 블록을 팀마다 하나씩(moneyKey로 구분해서) 그린다 —
  // 가이드가 각자 받은 돈을 따로 기재해야 서로 안 섞인다.
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
                    placeholder="항목 (예: 손님 이름)"
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
        <p className="text-xs text-ink-500">
          손님이 현장지불금을 현금이 아니라 계좌이체로 낸 경우, 이체 목적별로 나눠 적는다.
        </p>

        <div className="mt-3">
          <p className="text-xs font-medium text-ink-900">현금</p>
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
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">일정</h1>
        <p className="text-xs text-ink-500">
          예시 데이터 · 메모 입력 후 체크하면 저장 확인(초록색) · 이 브라우저에만 저장(계정 간 공유 안 됨)
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="이전 달"
            className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-700 hover:bg-rose-100 hover:text-rose-700"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-sm border border-line px-2 py-1 text-xs text-ink-700 hover:bg-rose-100 hover:text-rose-700"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="다음 달"
            className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-700 hover:bg-rose-100 hover:text-rose-700"
          >
            ›
          </button>
        </div>
        <p className="font-mono text-sm text-ink-900">
          {viewYear}. {viewMonth + 1}.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-7 bg-paper text-center font-mono text-xs tracking-wide text-ink-500 uppercase">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="border-b border-line px-2 py-1.5">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0 [&>*:nth-last-child(-n+7)]:border-b-0">
            {cells.map(({ date, inMonth }) => {
              const key = dateKey(date.getFullYear(), date.getMonth(), date.getDate());
              const daySchedules = schedulesByDate.get(key) ?? [];
              const isToday = key === todayKey;
              const isSaved = checked[key] ?? false;

              return (
                <div
                  key={key}
                  className={`flex min-h-24 flex-col gap-1 border-b border-r border-line p-1.5 ${
                    inMonth ? "bg-surface" : "bg-paper"
                  }`}
                >
                  <div
                    className={`flex items-center gap-1 rounded-sm px-0.5 ${isSaved ? "bg-good-wash" : ""}`}
                  >
                    <input
                      type="text"
                      value={notes[key] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="메모"
                      className={`w-0 min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-[11px] placeholder:text-ink-500/60 hover:border-line focus:border-line-strong focus:bg-paper focus:outline-none ${
                        isSaved ? "text-good" : "text-ink-700"
                      }`}
                    />
                    <input
                      type="checkbox"
                      title="메모 저장 확인"
                      checked={isSaved}
                      onChange={(e) => setChecked((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="h-3.5 w-3.5 accent-good"
                    />
                    <span
                      className={`w-5 text-right font-mono text-xs ${
                        isToday ? "font-semibold text-rose-700" : inMonth ? "text-ink-700" : "text-ink-500"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    {daySchedules.map((s) => {
                      const assignedGuides = getAssignedGuides(s);
                      const isSettled = scheduleSettled[s.id] ?? false;
                      const ticketReady = hasCheckedTicket(s.id);
                      // 정산완료(초록)가 입장권 체크(주황)보다 우선 — 정산까지 끝났으면
                      // 이미 그날 운영이 다 마무리된 것이므로 더 강한 상태로 본다.
                      const tone = isSettled ? "good" : ticketReady ? "warn" : null;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => openAssignmentModal(s)}
                          title={
                            isSettled
                              ? "가이드 정산 완료"
                              : ticketReady
                                ? "입장권 구매 확인됨"
                                : undefined
                          }
                          className={`rounded-sm border px-1.5 py-1 text-left leading-tight ${
                            tone === "good"
                              ? "border-good bg-good-wash hover:brightness-95"
                              : tone === "warn"
                                ? "border-warn bg-warn-wash hover:brightness-95"
                                : "border-line bg-paper hover:border-line-strong hover:bg-rose-100"
                          }`}
                        >
                          <p className="truncate text-[11px] font-medium text-ink-900">
                            {s.tourName}{" "}
                            {tone === "good" && <span className="text-good">✓</span>}
                            {tone === "warn" && <span className="text-warn">🎫</span>}
                          </p>
                          <p
                            className={`truncate font-mono text-[10px] ${
                              tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-ink-500"
                            }`}
                          >
                            ({bookedHeadcount(s.id)}/{getCapacity(s)}){" "}
                            {assignedGuides.length > 0 ? assignedGuides.join(", ") : "미배정"}
                          </p>
                        </button>
                      );
                    })}
                    {(() => {
                      const openedTourIds = new Set(daySchedules.map((s) => s.tourId));
                      const availableTours = SAMPLE_TOURS.filter((t) => !openedTourIds.has(t.id));
                      if (availableTours.length === 0) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => openTourOpenModal(key, availableTours[0].id)}
                          className="rounded-sm border border-dashed border-line-strong px-1.5 py-1 text-left text-[10px] text-ink-500 hover:border-rose-600 hover:text-rose-700"
                        >
                          + 투어 오픈
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {openSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={closeAssignmentModal}
        >
          <div
            className="w-full max-w-xs rounded-md bg-surface p-5 shadow-[0_1px_2px_rgba(28,29,36,0.06),0_6px_20px_-10px_rgba(28,29,36,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-ink-900">
              {openSchedule.tourName} ({bookedHeadcount(openSchedule.id)}/
              {Math.max(0, draftAvailable) + bookedHeadcount(openSchedule.id)})
            </p>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-ink-500">가능인원</span>
              <input
                type="number"
                min={0}
                value={draftAvailable}
                onChange={(e) => setDraftAvailable(Number(e.target.value))}
                className="w-16 rounded-sm border border-line px-1.5 py-0.5 text-right font-mono text-sm text-ink-900 focus:border-line-strong focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setRosterScheduleId(openSchedule.id)}
              className="mt-2 w-full rounded-sm border border-line py-1.5 text-xs text-ink-700 hover:bg-paper"
            >
              명단보기
            </button>

            {getTicketItems(openSchedule.id).some((t) => t.checked) && (
              <div className="mt-2 rounded-sm border border-warn bg-warn-wash p-2 text-xs text-warn">
                <p className="font-medium">🎫 구매한 입장권</p>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  {getTicketItems(openSchedule.id).map(
                    (t, idx) =>
                      t.checked && (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="whitespace-nowrap font-medium">{t.label || "(이름 없음)"}</span>
                          <input
                            value={t.note ?? ""}
                            onChange={(e) => updateTicketItem(openSchedule.id, idx, "note", e.target.value)}
                            placeholder="예: 20+10"
                            className="min-w-0 flex-1 rounded-sm border border-warn/40 bg-surface px-1.5 py-1 font-mono text-ink-900 focus:border-warn focus:outline-none"
                          />
                          {sumTicketNote(t.note ?? "") > 0 && (
                            <span className="whitespace-nowrap">= {sumTicketNote(t.note ?? "")}장</span>
                          )}
                        </div>
                      ),
                  )}
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="mb-1.5 text-sm text-ink-500">가이드선택</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {ASSIGNABLE_GUIDES.map((name) => (
                  <label key={name} className="flex items-center gap-1.5 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={draftGuides.includes(name)}
                      onChange={(e) => toggleDraftGuide(name, e.target.checked)}
                      className="h-3.5 w-3.5 accent-rose-600"
                    />
                    {name}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={saveAssignment}
                className="flex-1 rounded-sm bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                수정하기
              </button>
              <button
                type="button"
                onClick={closeAssignmentModal}
                className="flex-1 rounded-sm border border-line py-2 text-sm text-ink-700 hover:bg-paper"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {rosterSchedule && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setRosterScheduleId(null)}
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
                  onClick={() => setRosterScheduleId(null)}
                  aria-label="명단 닫기"
                  className="text-ink-500 hover:text-ink-700"
                >
                  ✕
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-ink-700">
              {rosterSchedule.tourName} · {rosterSchedule.date} {rosterSchedule.startTime}
            </p>
            <p className="text-xs text-ink-500">
              예약 {getRoster(rosterSchedule.id).length}건 · 총 {bookedHeadcount(rosterSchedule.id)}명(취소 제외) ·
              결제 금액은 예시 데이터입니다
            </p>

            {(() => {
              const teams = getTeams(rosterSchedule.id);
              const roster = getRoster(rosterSchedule.id);

              if (!teams) {
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => splitIntoTeams(rosterSchedule.id)}
                      className="mt-2 self-start rounded-sm border border-line px-2.5 py-1 text-xs text-ink-700 hover:bg-paper"
                    >
                      팀 나누기 (버스·가이드가 두 팀으로 나뉠 때)
                    </button>
                    <div className="mt-2 shrink-0 overflow-x-auto rounded-md border border-line">
                      {renderRosterTable(roster, null)}
                    </div>
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
                          <input
                            value={teamName}
                            onChange={(e) => renameTeam(rosterSchedule.id, index, e.target.value)}
                            className="w-24 rounded-sm border border-line px-2 py-1 text-sm font-medium text-ink-900 focus:border-line-strong focus:outline-none"
                          />
                          <span className="text-xs text-ink-500">
                            {teamReservations.reduce((sum, r) => sum + r.headcount, 0)}명
                          </span>
                          {teams.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTeam(rosterSchedule.id, index)}
                              className="ml-auto text-xs text-critical hover:underline"
                            >
                              팀 삭제
                            </button>
                          )}
                        </div>
                        <div className="overflow-x-auto rounded-md border border-line">
                          {renderRosterTable(teamReservations, teams)}
                        </div>
                        {(() => {
                          // 체크한 예약자가 이미 전부 이 팀 소속이면 "이 팀으로 옮기기" 버튼은
                          // 의미가 없으니(자기 자신에게 옮기기) 아예 숨긴다.
                          const selectedIds = [...selectedReservationIds];
                          const alreadyHere =
                            selectedIds.length > 0 && selectedIds.every((id) => getReservationTeamIndex(id) === index);
                          if (alreadyHere) return null;
                          return (
                            <button
                              type="button"
                              disabled={selectedIds.length === 0}
                              onClick={() => moveSelectedToTeam(index)}
                              className="mt-1.5 rounded-sm border border-line px-2.5 py-1 text-xs text-ink-700 hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              체크한 예약자를 &ldquo;{teamName}&rdquo;(으)로 옮기기
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })}
                  <p className="text-xs text-ink-500">
                    표에서 옮길 예약자를 체크하고, 보내고 싶은 팀 아래의 &ldquo;옮기기&rdquo; 버튼을 누르세요
                    {selectedReservationIds.size > 0 && ` · ${selectedReservationIds.size}명 선택됨`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addTeam(rosterSchedule.id)}
                      className="rounded-sm border border-line px-2.5 py-1 text-xs text-ink-700 hover:bg-paper"
                    >
                      + 팀 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => mergeTeams(rosterSchedule.id)}
                      className="rounded-sm border border-line px-2.5 py-1 text-xs text-ink-700 hover:bg-paper"
                    >
                      명단 합치기
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {teams.map((teamName, index) => (
                      <div key={index}>{renderPaymentBreakdown(moneyKey(rosterSchedule.id, index), teamName)}</div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-semibold text-ink-900">티켓 구매 확인</p>
              <p className="text-xs text-ink-500">
                입장권을 샀는지 체크한다. 하나라도 체크하면 캘린더 칸이 주황색으로 바뀐다.
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {getTicketItems(rosterSchedule.id).map((item, idx) => {
                  const items = getTicketItems(rosterSchedule.id);
                  return (
                    <div key={idx} className="rounded-sm border border-line p-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => updateTicketItem(rosterSchedule.id, idx, "checked", e.target.checked)}
                          className="h-3.5 w-3.5 accent-warn"
                        />
                        <input
                          value={item.label}
                          onChange={(e) => updateTicketItem(rosterSchedule.id, idx, "label", e.target.value)}
                          placeholder="입장권 (예: 구엘공원)"
                          className={`flex-1 rounded-sm border border-line px-2 py-1 text-sm focus:border-line-strong focus:outline-none ${
                            item.checked ? "text-warn line-through" : "text-ink-700"
                          }`}
                        />
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTicketItem(rosterSchedule.id, idx)}
                            aria-label="입장권 삭제"
                            className="text-ink-500 hover:text-critical"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 pl-6">
                        <input
                          value={item.note ?? ""}
                          onChange={(e) => updateTicketItem(rosterSchedule.id, idx, "note", e.target.value)}
                          placeholder="나눠 산 내역을 자유롭게 (예: 20+10)"
                          className="flex-1 rounded-sm border border-line px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                        />
                        {sumTicketNote(item.note ?? "") > 0 && (
                          <span className="whitespace-nowrap text-xs text-ink-500">
                            합계 {sumTicketNote(item.note ?? "")}장
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => addTicketItem(rosterSchedule.id)}
                className="mt-2 rounded-sm border border-line px-2.5 py-1 text-xs text-ink-700 hover:bg-paper"
              >
                입장권 추가
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRosterScheduleId(null)}
              className="mt-3 rounded-sm border border-line py-2 text-sm text-ink-700 hover:bg-paper"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {openTourDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={closeTourOpenModal}
        >
          <div
            className="w-full max-w-xs rounded-md bg-surface p-5 shadow-[0_1px_2px_rgba(28,29,36,0.06),0_6px_20px_-10px_rgba(28,29,36,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-ink-900">투어 오픈 · {openTourDate}</p>

            <label className="mt-3 flex flex-col gap-1 text-sm text-ink-700">
              투어
              <select
                value={newTourForm.tourId}
                onChange={(e) => setNewTourForm((prev) => ({ ...prev, tourId: e.target.value }))}
                className="rounded-sm border border-line px-2 py-1.5 text-sm focus:border-line-strong focus:outline-none"
              >
                {SAMPLE_TOURS.filter(
                  (t) => !(schedulesByDate.get(openTourDate) ?? []).some((s) => s.tourId === t.id),
                ).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 flex flex-col gap-1 text-sm text-ink-700">
              가능인원
              <input
                type="number"
                min={0}
                value={newTourForm.capacity}
                onChange={(e) => setNewTourForm((prev) => ({ ...prev, capacity: e.target.value }))}
                className="rounded-sm border border-line px-2 py-1.5 text-sm font-mono focus:border-line-strong focus:outline-none"
              />
            </label>

            <div className="mt-4">
              <p className="mb-1.5 text-sm text-ink-500">가이드선택</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {ASSIGNABLE_GUIDES.map((name) => (
                  <label key={name} className="flex items-center gap-1.5 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={newTourForm.guides.includes(name)}
                      onChange={(e) => toggleNewTourGuide(name, e.target.checked)}
                      className="h-3.5 w-3.5 accent-rose-600"
                    />
                    {name}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={submitTourOpen}
                className="flex-1 rounded-sm bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                오픈하기
              </button>
              <button
                type="button"
                onClick={closeTourOpenModal}
                className="flex-1 rounded-sm border border-line py-2 text-sm text-ink-700 hover:bg-paper"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
