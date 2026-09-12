/**
 * Fixtures for frontend-first review — every admin/guide/customer screen
 * reads from here for now. Deliberately shaped like the schema draft in
 * `supabase/migrations/`, but nothing here is wired to Supabase yet: the
 * plan is to get UI feedback first, then finalize the schema against what
 * the screens actually turned out to need.
 */

export type StaffRole = "admin" | "guide";

export const SAMPLE_STAFF = [
  { id: "s1", name: "이관리", role: "admin" as StaffRole, phone: "010-1111-2222" },
  { id: "s2", name: "박정훈", role: "guide" as StaffRole, phone: "010-2222-3333" },
  { id: "s3", name: "김건우", role: "guide" as StaffRole, phone: "010-3333-4444" },
  { id: "s4", name: "노신", role: "guide" as StaffRole, phone: "010-4444-5555" },
  { id: "s5", name: "김보성", role: "guide" as StaffRole, phone: "010-5555-6666" },
  { id: "s6", name: "박정현", role: "guide" as StaffRole, phone: "010-6666-7777" },
  { id: "s7", name: "현병국", role: "guide" as StaffRole, phone: "010-7777-8888" },
];

export const SAMPLE_TOURS = [
  { id: "t1", name: "가우디 마스터패스 투어", region: "Barcelona", isCustomerVisible: true, myRealTripUrl: "https://www.myrealtrip.com/offers/12345" },
  { id: "t2", name: "가우디 핵심 버스 투어", region: "Barcelona", isCustomerVisible: true, myRealTripUrl: "https://www.myrealtrip.com/offers/12346" },
  { id: "t3", name: "바르셀로나 야간산책투어", region: "Barcelona", isCustomerVisible: true, myRealTripUrl: null },
  { id: "t4", name: "세비야 대성당 투어", region: "Sevilla", isCustomerVisible: false, myRealTripUrl: null },
];

const SEPTEMBER_TOUR_DEFAULTS: Array<{ tourId: string; tourName: string; startTime: string; capacity: number }> = [
  { tourId: "t1", tourName: "가우디 마스터패스 투어", startTime: "09:00", capacity: 29 },
  { tourId: "t2", tourName: "가우디 핵심 버스 투어", startTime: "14:00", capacity: 35 },
  { tourId: "t3", tourName: "바르셀로나 야간산책투어", startTime: "19:30", capacity: 20 },
];

// 09-17만 예약 화면 데모(SAMPLE_RESERVATIONS)가 이미 이 id들을 참조하고 있어서
// 그대로 유지 — 나머지 날짜는 `${tourId}-${date}`로 새로 만든다.
const LEGACY_SCHEDULE_IDS: Record<string, string> = { t1: "sc1", t2: "sc2", t3: "sc3" };
const LEGACY_SCHEDULE_DATE = "2026-09-17";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * 실제 운영 흐름은 "매달 세 투어 스케줄을 먼저 통째로 만들어두고, 예약이
 * 들어오고 가이드를 배정하는 건 그 다음에 날짜별로 한다"이다(2026-09-12
 * 확인). 그래서 9월 한 달 전부를 세 투어로 채우되, 예약 인원(headcount는
 * 화면에서 SAMPLE_RESERVATIONS 기준으로 계산)과 가이드 배정 전 기본값은
 * "0명 · 관리자"로 둔다. 09-17만 예외로 예약 화면 데모 표본이 붙어 있어
 * 그 셋만 실제 예약 인원이 잡혀 보인다 — 실제 배정 UI가 생기면 이 목록의
 * guideNames를 날짜별로 갈아끼우면 된다.
 *
 * guideNames는 배열이다 — 캘린더에서 스케줄 하나에 가이드를 복수 선택해
 * 배정할 수 있어야 해서(공동 진행·백업 등), 배정 화면에서 다중 체크박스로
 * 고른다. "관리자"는 실제 계정이 아니라 "아직 개별 배정 안 함"을 뜻하는
 * 자리표시자 값.
 */
export type Schedule = {
  id: string;
  tourId: string;
  tourName: string;
  date: string;
  startTime: string;
  capacity: number;
  guideNames: string[];
};

// 관리자가 캘린더에서 빈 날짜에 "투어 오픈"으로 새로 만든 스케줄. 이 브라우저의
// localStorage에 저장되고, SAMPLE_SCHEDULES와 합쳐서 보여준다.
export const ADDED_SCHEDULES_STORAGE_KEY = "fmt-added-schedules";

export const SAMPLE_SCHEDULES: Schedule[] = Array.from({ length: 30 }, (_, i) => i + 1).flatMap((day) => {
  const date = `2026-09-${pad2(day)}`;
  return SEPTEMBER_TOUR_DEFAULTS.map(({ tourId, tourName, startTime, capacity }) => ({
    id: date === LEGACY_SCHEDULE_DATE ? LEGACY_SCHEDULE_IDS[tourId] : `${tourId}-${date}`,
    tourId,
    tourName,
    date,
    startTime,
    capacity,
    guideNames: ["관리자"],
  }));
});

// 배정 모달의 체크박스 후보 목록. "관리자"(미배정 자리표시자)를 맨 앞에 두고
// 그 뒤로 실제 가이드 계정을 나열한다.
export const ASSIGNABLE_GUIDES = [
  "관리자",
  ...SAMPLE_STAFF.filter((s) => s.role === "guide").map((s) => s.name),
];

export type ReservationChannel = "partner_agency" | "staff_entry";
// 2026-09-12 확인: 취소 사유(미입금·고객요청·환불)는 따로 안 나누고 "예약취소"
// 하나로 합친다. "대기"는 "입금대기"로 — 예약금 받기 전 상태라는 뜻을 분명히 한다.
export type ReservationStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type AttendanceMark = "yes" | "no" | null;

// 항목명 + 값 하나씩인 자유 입력 행 — "상세 인원"(성인/아동 등 구분)과
// "옵션 항목"(투어 옵션별 결제 금액)에서 똑같은 모양으로 재사용한다.
export type LabeledEntry = { label: string; value: string };

export type Reservation = {
  id: string;
  scheduleId: string;
  tourName: string;
  date: string;
  channel: ReservationChannel;
  partnerName: string | null;
  status: ReservationStatus;
  settled: boolean;
  contactName: string;
  email: string;
  headcount: number;
  // 아래는 명단보기(가이드 배정 창)에서만 쓰는 결제·현장 운영 필드.
  // 실제로는 예약금은 국내에서 원화(₩)로, 현장지불금은 현지에서 유로(€)로
  // 받는 구조라 통화가 섞여 있다 — 각 필드 이름에 통화를 붙여둔다.
  phone: string;
  advanceDepositKrw: number;
  onSitePaymentEur: number; // 현장지불금(€) — 예약 페이지에서 직접 입력
  registeredAt: string;
  attended: AttendanceMark;
  // 아래는 예약 페이지의 "추가하기" 폼에서만 쓰는 선택 필드 — 기존 표본
  // 예약 3건은 없어도 되게 옵셔널로 둔다.
  earlyBirdDiscount?: boolean;
  detailBreakdown?: LabeledEntry[]; // 예: 성인 2명 / 아동 1명
  optionItems?: LabeledEntry[]; // 예: 구엘공원 13€, 사그라다 파밀리아 26€
};

// 예약 페이지에서 새로 추가한/수정한 예약은 이 브라우저의 localStorage에
// 저장되고, 일정 페이지의 명단보기도 같은 키를 읽어서 두 화면이 같은
// 예약을 본다 — 한쪽에서만 저장하고 다른 쪽이 안 읽으면 서로 어긋난다.
export const ADDED_RESERVATIONS_STORAGE_KEY = "fmt-added-reservations";
export const RESERVATION_EDITS_STORAGE_KEY = "fmt-reservation-edits";

export const SAMPLE_RESERVATIONS: Reservation[] = [
  {
    id: "r1",
    scheduleId: "sc1",
    tourName: "가우디 마스터패스 투어",
    date: "2026-09-17",
    channel: "partner_agency",
    partnerName: "살레트래블",
    status: "confirmed",
    settled: false,
    contactName: "김수희",
    email: "suhee.kim@example.com",
    headcount: 2,
    phone: "+82 10-1234-5678",
    advanceDepositKrw: 100000,
    onSitePaymentEur: 0,
    registeredAt: "2026-09-12 19:45",
    attended: null,
  },
  {
    id: "r2",
    scheduleId: "sc2",
    tourName: "가우디 핵심 버스 투어",
    date: "2026-09-17",
    channel: "staff_entry",
    partnerName: null,
    status: "confirmed",
    settled: true,
    contactName: "야간투어 이벤트 당첨자",
    email: "event-winner@example.com",
    headcount: 4,
    phone: "+82 10-2222-3333",
    advanceDepositKrw: 0,
    onSitePaymentEur: 0,
    registeredAt: "2026-09-10 00:07",
    attended: "yes",
  },
  {
    id: "r3",
    scheduleId: "sc3",
    tourName: "바르셀로나 야간산책투어",
    date: "2026-09-17",
    channel: "staff_entry",
    partnerName: null,
    status: "cancelled",
    settled: false,
    contactName: "이서연",
    email: "seoyeon.lee@example.com",
    headcount: 1,
    phone: "+82 10-3333-4444",
    advanceDepositKrw: 0,
    onSitePaymentEur: 0,
    registeredAt: "2026-09-08 11:20",
    attended: "no",
  },
];

export type ReviewStatus = "pending" | "approved" | "rejected";

export const SAMPLE_REVIEWS: Array<{
  id: string;
  tourName: string;
  tourDate: string;
  authorName: string;
  content: string;
  status: ReviewStatus;
}> = [
  { id: "rv1", tourName: "가우디 핵심 버스 투어", tourDate: "2026-09-01", authorName: "박현규", content: "가이드님이 정말 친절하게 설명해주셔서 좋았어요!", status: "approved" },
  { id: "rv2", tourName: "가우디 마스터패스 투어", tourDate: "2026-09-05", authorName: "채유리", content: "대행사로 예약했는데 후기 남길 곳이 여기밖에 없어서 남겨요. 만족스러웠습니다.", status: "pending" },
  { id: "rv3", tourName: "바르셀로나 야간산책투어", tourDate: "2026-08-20", authorName: "익명", content: "링크입니다 http://spam.example", status: "pending" },
];

export const SAMPLE_LEDGER_ENTRIES = [
  { id: "l1", scheduleId: "sc1", tourName: "가우디 마스터패스 투어", date: "2026-09-01", guideName: "김보성", headcount: 34, tourFee: 0, ticketFee: 2444, miscIncome: 663827, miscExpense: 1410, settlement: 664861 },
  { id: "l2", scheduleId: "sc2", tourName: "가우디 핵심 버스 투어", date: "2026-09-01", guideName: "박정현", headcount: 15, tourFee: 0, ticketFee: 270, miscIncome: 0, miscExpense: 96, settlement: 174 },
];

export const SAMPLE_TICKET_ENTRIES = [
  { id: "tk1", venue: "성당 (사그라다 파밀리아)", date: "2026-09-01", tourName: "가우디 핵심 버스 투어", direction: "income" as const, channel: "customer", amount: 270 },
  { id: "tk2", venue: "공원 (구엘공원)", date: "2026-09-01", tourName: "가우디 마스터패스 투어", direction: "income" as const, channel: "customer", amount: 2444 },
  { id: "tk3", venue: "성당 (사그라다 파밀리아)", date: "2026-09-02", tourName: "가우디 마스터패스 투어", direction: "expense" as const, channel: "lacaixa", amount: 900 },
];
