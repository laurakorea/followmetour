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
];

export const SAMPLE_TOURS = [
  { id: "t1", name: "가우디 마스터패스 투어", region: "Barcelona", isCustomerVisible: true, myRealTripUrl: "https://www.myrealtrip.com/offers/12345" },
  { id: "t2", name: "가우디 핵심 버스 투어", region: "Barcelona", isCustomerVisible: true, myRealTripUrl: "https://www.myrealtrip.com/offers/12346" },
  { id: "t3", name: "바르셀로나 야간산책투어", region: "Barcelona", isCustomerVisible: true, myRealTripUrl: null },
  { id: "t4", name: "세비야 대성당 투어", region: "Sevilla", isCustomerVisible: false, myRealTripUrl: null },
];

export const SAMPLE_SCHEDULES = [
  { id: "sc1", tourId: "t1", tourName: "가우디 마스터패스 투어", date: "2026-09-17", startTime: "09:00", capacity: 29, guideName: "박정훈" },
  { id: "sc2", tourId: "t2", tourName: "가우디 핵심 버스 투어", date: "2026-09-17", startTime: "14:00", capacity: 35, guideName: "김건우" },
  { id: "sc3", tourId: "t3", tourName: "바르셀로나 야간산책투어", date: "2026-09-17", startTime: "19:30", capacity: 20, guideName: "박정훈" },
];

export type ReservationChannel = "partner_agency" | "staff_entry";
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled_unpaid"
  | "cancelled_by_customer"
  | "cancelled_refunded";

export const SAMPLE_RESERVATIONS: Array<{
  id: string;
  scheduleId: string;
  tourName: string;
  date: string;
  channel: ReservationChannel;
  partnerName: string | null;
  status: ReservationStatus;
  settled: boolean;
  contactName: string;
  headcount: number;
}> = [
  { id: "r1", scheduleId: "sc1", tourName: "가우디 마스터패스 투어", date: "2026-09-17", channel: "partner_agency", partnerName: "살레트래블", status: "confirmed", settled: false, contactName: "김수희", headcount: 2 },
  { id: "r2", scheduleId: "sc2", tourName: "가우디 핵심 버스 투어", date: "2026-09-17", channel: "staff_entry", partnerName: null, status: "confirmed", settled: true, contactName: "야간투어 이벤트 당첨자", headcount: 4 },
  { id: "r3", scheduleId: "sc3", tourName: "바르셀로나 야간산책투어", date: "2026-09-17", channel: "staff_entry", partnerName: null, status: "cancelled_by_customer", settled: false, contactName: "이서연", headcount: 1 },
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
