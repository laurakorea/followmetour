/**
 * Fixtures for frontend-first review — every admin/guide/customer screen
 * reads from here for now. Deliberately shaped like the schema draft in
 * `supabase/migrations/`, but nothing here is wired to Supabase yet: the
 * plan is to get UI feedback first, then finalize the schema against what
 * the screens actually turned out to need.
 */

export type StaffRole = "admin" | "guide";
// 재직 중 / 이전 직원 — 그만둔 사람도 기록은 지우지 않고 "이전 직원"으로만
// 옮겨둔다(2026-09-13 확인).
export type StaffStatus = "active" | "former";

export type Staff = {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  status: StaffStatus;
  // 가이드 로그인(guide/login)용 PIN — 관리자가 계정 화면에서 지정·확인한다
  // (2026-09-13 확인). 실제 인증이 붙기 전까지의 데모용 비밀번호.
  pin: string;
};

export const SAMPLE_STAFF: Staff[] = [
  { id: "s1", name: "이관리", role: "admin", phone: "010-1111-2222", status: "active", pin: "2222" },
  { id: "s2", name: "박정훈", role: "guide", phone: "010-2222-3333", status: "active", pin: "3333" },
  { id: "s3", name: "김건우", role: "guide", phone: "010-3333-4444", status: "active", pin: "4444" },
  { id: "s4", name: "노신", role: "guide", phone: "010-4444-5555", status: "active", pin: "5555" },
  { id: "s5", name: "김보성", role: "guide", phone: "010-5555-6666", status: "active", pin: "6666" },
  { id: "s6", name: "박정현", role: "guide", phone: "010-6666-7777", status: "active", pin: "7777" },
  { id: "s7", name: "현병국", role: "guide", phone: "010-7777-8888", status: "active", pin: "8888" },
];

// 계정 화면에서 관리자가 새로 추가한 직원(전체 레코드, 자유롭게 수정 가능).
export const ADDED_STAFF_STORAGE_KEY = "fmt-added-staff";
// 표본 직원(SAMPLE_STAFF)은 상수라 직접 못 바꾸니, 수정한 내용은 id -> 통째로
// 바뀐 직원 정보로 이 오버라이드 맵에 저장한다(정산서 수정과 같은 패턴).
export const STAFF_EDITS_STORAGE_KEY = "fmt-staff-edits";
// id -> 재직 상태(재직 중/이전 직원). 표본·추가 직원 공통으로 이 맵 하나로
// 관리한다 — 레코드 자체는 절대 지우지 않고 상태만 옮긴다.
export const STAFF_STATUS_STORAGE_KEY = "fmt-staff-status";

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

// scheduleId -> 배정된 가이드 이름 목록(관리자가 배정 창에서 고친 값). 일정
// 페이지와 가이드배정확인 페이지가 같은 키를 읽어서 같은 배정을 본다.
export const SCHEDULE_GUIDES_STORAGE_KEY = "fmt-admin-schedule-guides";

// scheduleId -> 정원(관리자가 배정 창에서 직접 고친 값). 일정 페이지와
// 월별인원관리 페이지가 같은 키를 읽어서 같은 정원을 본다.
export const SCHEDULE_CAPACITY_STORAGE_KEY = "fmt-admin-schedule-capacity";

// 투어별 실제 진행 시간(관리자 확인, 2026-09-12) — 가이드배정확인에서
// "몇 번 · 몇 시간" 집계할 때 쓴다. 목록에 없는 투어는 0시간으로 취급한다.
export const TOUR_DURATION_HOURS: Record<string, number> = {
  t1: 6.5, // 가우디 마스터패스 투어
  t2: 5, // 가우디 핵심 버스 투어
  t3: 1, // 바르셀로나 야간산책투어
};

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

/**
 * 정산 > 영수증 관리. 기존에는 구글 시트(타임스탬프/성함/급여 수령일/영수증
 * 사용한 날짜/사유/총 금액/영수증 캡처사진 첨부 열)로 관리하던 걸 그대로
 * 옮긴다(2026-09-12 확인). 가이드가 자기 계정에서 사진+금액을 올리면
 * 관리자 쪽 화면에 뜨고, 가이드 본인도 자기가 올린 내역을 다시 볼 수 있어야
 * 한다. 사진은 백엔드가 없어서 지금은 브라우저에 data URL로만 저장 —
 * 실제 파일 스토리지(Supabase Storage 등)는 스키마 확정 단계에서 붙인다.
 */
export type Receipt = {
  id: string;
  guideName: string;
  submittedAt: string; // 타임스탬프 — 제출 시각(ISO)
  payoutDate: string; // 급여 수령일 (YYYY-MM-DD)
  usedDate: string; // 영수증 사용한 날짜 (YYYY-MM-DD)
  reason: string; // 사유
  amountKrw: number; // 총 금액(₩)
  photoDataUrl: string; // 영수증 캡처사진 — data URL
};

// Supabase Auth가 아직 없어서(2026-09-13 확인), 가이드 로그인 화면
// (guide/login)에서 "성함 + PIN(연락처 뒷 4자리, 데모용)"을 확인한 뒤 여기에
// 로그인한 가이드 이름을 저장한다. guide/layout이 이 키를 보고 없으면
// guide/login으로 돌려보낸다 — 다른 가이드 이름으로 바꿔볼 수 없고, 로그인한
// 본인 것만 보인다. 실제 인증이 붙으면 이 키는 지운다.
export const GUIDE_CURRENT_NAME_STORAGE_KEY = "fmt-guide-current-name";

// 가이드 로그인 화면의 이름 선택지. "관리자"는 미배정 자리표시자라 여기서는 뺀다.
export const GUIDE_NAMES = SAMPLE_STAFF.filter((s) => s.role === "guide").map((s) => s.name);

// 가이드가 새로 올린 영수증. 관리자 페이지와 가이드 페이지가 같은 키를
// 읽고 써서 두 화면이 같은 목록을 본다.
export const ADDED_RECEIPTS_STORAGE_KEY = "fmt-added-receipts";
// receiptId -> 관리자가 "확인" 체크한 여부. 표본 영수증(SAMPLE_RECEIPTS)은
// 읽기 전용이라 별도 오버라이드 맵으로 관리한다(예약 수정 내역과 같은 패턴).
export const RECEIPT_CHECKED_STORAGE_KEY = "fmt-receipt-checked";

// 목업 초기 데이터 — 실제 시트에 있던 스타일을 참고한 예시 몇 건.
export const SAMPLE_RECEIPTS: Receipt[] = [
  {
    id: "rcpt1",
    guideName: "박정훈",
    submittedAt: "2026-09-05T10:22:00",
    payoutDate: "2026-09-25",
    usedDate: "2026-09-04",
    reason: "대성당 입장권",
    amountKrw: 18000,
    photoDataUrl: "",
  },
  {
    id: "rcpt2",
    guideName: "김건우",
    submittedAt: "2026-09-08T21:05:00",
    payoutDate: "2026-09-25",
    usedDate: "2026-09-08",
    reason: "현장 교통비(택시)",
    amountKrw: 9500,
    photoDataUrl: "",
  },
];

/**
 * 정산 > 가이드 정산. 관리자가 주별로 가이드에게 보내는 정산서(2026-09-12
 * 확인한 예시 이미지 기준) — 가이드가 그 주에 현금으로 갖고 있는 금액(정산금,
 * 예: 티켓비)과 그중 가이드에게 돌려줄 지급 항목(예: 로컬비)을 나눠 적고,
 * "정산금 합계 - 지급 합계 = 최종 정산 금액"으로 가이드가 사무실에 갖고 와야
 * 할 금액을 계산한다. 가이드별로 정산서가 쌓이고, 각 정산서는 그 가이드
 * 본인만 봐야 한다(2026-09-12 확인) — 지금은 로그인이 없어서 가이드 화면의
 * "나는 누구" 선택값으로만 걸러서 보여준다.
 */
export type SettlementLineItem = { label: string; amount: number };

export type GuideSettlementSheet = {
  id: string;
  guideName: string;
  region: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  collectedItems: SettlementLineItem[]; // 정산 해당 날짜 · 정산금 — 가이드가 갖고 있는 현금
  payoutItems: SettlementLineItem[]; // 지급 항목 · 금액 — 가이드에게 돌려줄 경비
};

// 관리자가 새로 만들거나 고친 정산서. 관리자 페이지와 가이드 페이지가 같은
// 키를 읽어서 두 화면이 같은 정산서를 본다.
export const ADDED_GUIDE_SETTLEMENTS_STORAGE_KEY = "fmt-guide-settlements";
// 표본 정산서(SAMPLE_GUIDE_SETTLEMENTS)는 상수라 직접 못 바꾸니, 수정한 내용은
// id -> 통째로 바뀐 정산서로 이 오버라이드 맵에 저장한다(예약 수정 내역과
// 같은 패턴). 화면에서는 표본 대신 이 오버라이드를 우선해서 보여준다.
export const GUIDE_SETTLEMENT_EDITS_STORAGE_KEY = "fmt-guide-settlement-edits";

// 목업 초기 데이터 — 2026-09-12에 공유받은 실제 정산서 예시를 그대로 옮김.
export const SAMPLE_GUIDE_SETTLEMENTS: GuideSettlementSheet[] = [
  {
    id: "gs1",
    guideName: "김건우",
    region: "바르셀로나",
    periodStart: "2026-09-06",
    periodEnd: "2026-09-12",
    collectedItems: [
      { label: "7일 티켓비", amount: 630 },
      { label: "8일 티켓비", amount: 2100 },
      { label: "9일 티켓비", amount: 1500 },
      { label: "10일 티켓비", amount: 1050 },
      { label: "11일 티켓비", amount: 1200 },
    ],
    payoutItems: [
      { label: "7일 로컬비", amount: 120 },
      { label: "8일 로컬비", amount: 60 },
      { label: "9일 로컬비", amount: 60 },
      { label: "10일 로컬비", amount: 60 },
      { label: "11일 로컬비", amount: 60 },
    ],
  },
];

// 정산서 하나를 관리자가 "처리완료"로 체크했는지. 표본·추가분 모두 이 하나의
// 오버라이드 맵으로 관리한다(영수증 확인 체크와 같은 패턴) — 체크하면 카드가
// 초록색으로 바뀐다.
export const GUIDE_SETTLEMENT_COMPLETED_STORAGE_KEY = "fmt-guide-settlement-completed";

/**
 * 정산 > 가이드 정산 > 급여. 정산서(가이드가 갖고 있던 현금을 사무실에 갖고
 * 오는 것)와는 반대로, 사무실이 가이드에게 주는 급여 내역을 관리자가
 * 기록해둔다 — 같은 "가이드 정산" 메뉴 안에서 급여/정산서 두 카테고리로
 * 나눠 보여준다. 양식은 2026-09-13에 공유받은 실제 급여명세서(월 단위,
 * 지급항목/공제항목 좌우 2단, "급여계 - 공제합계 = 차감 수령액") 그대로.
 */
export type PayslipLineItem = { label: string; amount: number };

export type GuidePayslip = {
  id: string;
  guideName: string;
  region: string; // 지역
  payMonth: string; // 급여 대상 월, YYYY-MM
  payDate: string; // 지급일, YYYY-MM-DD
  paymentItems: PayslipLineItem[]; // 지급항목 · 지급액 (급여, 후기, 통신비, 교통비, 간식비, 인센 등)
  deductionItems: PayslipLineItem[]; // 공제항목 · 공제액 (세금, 현지통장 이체된 금액 등)
};

// 관리자가 새로 만들거나 고친 급여명세서. 관리자 페이지와 가이드 페이지가
// 같은 키를 읽어서 두 화면이 같은 명세서를 본다.
export const ADDED_GUIDE_PAYSLIPS_STORAGE_KEY = "fmt-guide-payslips";
// 표본 급여명세서(SAMPLE_GUIDE_PAYSLIPS) 수정 내용 — 정산서와 같은 오버라이드
// 맵 패턴.
export const GUIDE_PAYSLIP_EDITS_STORAGE_KEY = "fmt-guide-payslip-edits";

// 급여명세서 하나를 관리자가 "처리완료"(지급 완료)로 체크했는지.
export const GUIDE_PAYSLIP_COMPLETED_STORAGE_KEY = "fmt-guide-payslip-completed";

// 목업 초기 데이터 — 2026-09-13에 공유받은 실제 급여명세서 예시를 그대로 옮김.
export const SAMPLE_GUIDE_PAYSLIPS: GuidePayslip[] = [
  {
    id: "ps1",
    guideName: "김건우",
    region: "바르셀로나",
    payMonth: "2026-08",
    payDate: "2026-09-05",
    paymentItems: [
      { label: "급여", amount: 2200 },
      { label: "후기", amount: 1055 },
      { label: "통신비", amount: 20 },
      { label: "교통비", amount: 0 },
      { label: "간식비", amount: 100 },
      { label: "1%인센", amount: 359.58 },
    ],
    deductionItems: [
      { label: "세금", amount: 92.93 },
      { label: "현지통장 이체된 금액", amount: 1336.78 },
    ],
  },
];
