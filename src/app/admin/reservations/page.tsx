"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import {
  ADDED_RESERVATIONS_STORAGE_KEY,
  RESERVATION_EDITS_STORAGE_KEY,
  SAMPLE_RESERVATIONS,
  SAMPLE_SCHEDULES,
  SAMPLE_TOURS,
  type LabeledEntry,
  type Reservation,
  type ReservationChannel,
  type ReservationStatus,
} from "@/lib/sample-data";

// 일정 페이지가 그 투어·날짜에 실제로 쓰고 있는 스케줄 id를 찾는다(9월 17일처럼
// 예약 데모가 이미 연결된 날짜는 "sc1" 같은 예전 id를 그대로 쓰고 있어서,
// `${tourId}-${date}` 형식으로 새로 만들면 어긋난다). 못 찾으면 그 형식으로
// 만든 id를 그대로 쓴다 — 9월 밖의 날짜처럼 아직 스케줄이 없는 경우다.
function resolveScheduleId(tourId: string, date: string) {
  const match = SAMPLE_SCHEDULES.find((s) => s.tourId === tourId && s.date === date);
  return match?.id ?? `${tourId}-${date}`;
}

const STATUS_LABEL: Record<ReservationStatus, { label: string; tone: "good" | "warn" | "critical" | "neutral" }> = {
  pending: { label: "입금대기", tone: "warn" },
  confirmed: { label: "예약완료", tone: "good" },
  completed: { label: "투어완료", tone: "good" },
  cancelled: { label: "예약취소", tone: "critical" },
};

const EMPTY_ENTRY: LabeledEntry = { label: "", value: "" };

type FormState = {
  editingId: string | null; // null이면 새 예약 추가, 값이 있으면 그 예약 수정 중
  tourId: string;
  date: string;
  contactName: string;
  email: string;
  phone: string;
  status: ReservationStatus;
  advanceDepositKrw: string;
  onSitePaymentEur: string;
  headcount: string;
  detailBreakdown: LabeledEntry[];
  channel: ReservationChannel;
  partnerName: string;
  earlyBirdDiscount: boolean;
  optionItems: LabeledEntry[];
};

function emptyForm(): FormState {
  return {
    editingId: null,
    tourId: SAMPLE_TOURS[0]?.id ?? "",
    date: "",
    contactName: "",
    email: "",
    phone: "",
    status: "confirmed",
    advanceDepositKrw: "",
    onSitePaymentEur: "",
    headcount: "1",
    detailBreakdown: [{ ...EMPTY_ENTRY }],
    channel: "staff_entry",
    partnerName: "",
    earlyBirdDiscount: false,
    optionItems: [{ ...EMPTY_ENTRY }],
  };
}

function formFromReservation(r: Reservation): FormState {
  const tour = SAMPLE_TOURS.find((t) => t.name === r.tourName);
  return {
    editingId: r.id,
    tourId: tour?.id ?? SAMPLE_TOURS[0]?.id ?? "",
    date: r.date,
    contactName: r.contactName,
    email: r.email,
    phone: r.phone,
    status: r.status,
    advanceDepositKrw: String(r.advanceDepositKrw),
    onSitePaymentEur: String(r.onSitePaymentEur),
    headcount: String(r.headcount),
    detailBreakdown: r.detailBreakdown && r.detailBreakdown.length > 0 ? r.detailBreakdown : [{ ...EMPTY_ENTRY }],
    channel: r.channel,
    partnerName: r.partnerName ?? "",
    earlyBirdDiscount: r.earlyBirdDiscount ?? false,
    optionItems: r.optionItems && r.optionItems.length > 0 ? r.optionItems : [{ ...EMPTY_ENTRY }],
  };
}

function numberOrZero(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminReservationsPage() {
  // 예약 페이지에서 만든 예약은 이 브라우저의 localStorage에 저장되고, 일정
  // 페이지의 명단보기도 같은 키를 읽어서 두 화면이 같은 예약을 본다.
  const [addedReservations, setAddedReservations] = useState<Reservation[]>([]);
  // 예약 ID -> 관리자가 행을 눌러 수정한 값. 표본 3건 + 새로 추가한 예약 모두에 적용된다.
  const [reservationEdits, setReservationEdits] = useState<Record<string, Reservation>>({});
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ADDED_RESERVATIONS_STORAGE_KEY);
      const savedEdits = localStorage.getItem(RESERVATION_EDITS_STORAGE_KEY);
      if (saved) setAddedReservations(JSON.parse(saved));
      if (savedEdits) setReservationEdits(JSON.parse(savedEdits));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 빈 상태로 계속 진행
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ADDED_RESERVATIONS_STORAGE_KEY, JSON.stringify(addedReservations));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [addedReservations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(RESERVATION_EDITS_STORAGE_KEY, JSON.stringify(reservationEdits));
    } catch {
      // 저장 실패는 조용히 무시 — 화면 동작에는 영향 없음
    }
  }, [reservationEdits, hydrated]);

  const allReservations = useMemo(
    () => [...addedReservations, ...SAMPLE_RESERVATIONS].map((r) => reservationEdits[r.id] ?? r),
    [addedReservations, reservationEdits],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allReservations;
    return allReservations.filter((r) =>
      [r.contactName, r.email, r.phone, r.tourName, r.partnerName ?? ""].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }, [allReservations, query]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateEntry(listKey: "detailBreakdown" | "optionItems", index: number, field: keyof LabeledEntry, value: string) {
    setForm((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addEntry(listKey: "detailBreakdown" | "optionItems") {
    setForm((prev) => ({ ...prev, [listKey]: [...prev[listKey], { ...EMPTY_ENTRY }] }));
  }

  function removeEntry(listKey: "detailBreakdown" | "optionItems", index: number) {
    setForm((prev) => ({
      ...prev,
      [listKey]: prev[listKey].length > 1 ? prev[listKey].filter((_, i) => i !== index) : prev[listKey],
    }));
  }

  const optionTotal = form.optionItems.reduce((sum, item) => sum + numberOrZero(item.value), 0);

  function closeForm() {
    setShowForm(false);
    setForm(emptyForm());
  }

  function openAddForm() {
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEditForm(reservation: Reservation) {
    setForm(formFromReservation(reservation));
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tour = SAMPLE_TOURS.find((t) => t.id === form.tourId);
    if (!tour || !form.date || !form.contactName) return;

    const original = form.editingId ? allReservations.find((r) => r.id === form.editingId) : null;

    const reservation: Reservation = {
      id: original?.id ?? `r-added-${Date.now()}`,
      scheduleId: resolveScheduleId(tour.id, form.date),
      tourName: tour.name,
      date: form.date,
      channel: form.channel,
      partnerName: form.channel === "partner_agency" ? form.partnerName.trim() || null : null,
      status: form.status,
      settled: original?.settled ?? false,
      contactName: form.contactName,
      email: form.email,
      headcount: Math.max(1, Math.round(numberOrZero(form.headcount)) || 1),
      phone: form.phone,
      advanceDepositKrw: numberOrZero(form.advanceDepositKrw),
      onSitePaymentEur: numberOrZero(form.onSitePaymentEur),
      registeredAt: original?.registeredAt ?? new Date().toISOString().slice(0, 16).replace("T", " "),
      attended: original?.attended ?? null,
      earlyBirdDiscount: form.earlyBirdDiscount,
      detailBreakdown: form.detailBreakdown.filter((entry) => entry.label.trim() || entry.value.trim()),
      optionItems: form.optionItems.filter((entry) => entry.label.trim() || entry.value.trim()),
    };

    if (original) {
      setReservationEdits((prev) => ({ ...prev, [original.id]: reservation }));
    } else {
      setAddedReservations((prev) => [reservation, ...prev]);
    }
    closeForm();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-ink-900">예약</h1>
          <button
            type="button"
            onClick={openAddForm}
            className="rounded-sm bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700"
          >
            + 추가하기
          </button>
        </div>
        <p className="text-xs text-ink-500">예시 데이터 · 자사·파트너 통합</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름, 이메일, 연락처로 검색"
          className="w-full max-w-xs rounded-sm border border-line px-3 py-1.5 text-sm focus:border-line-strong focus:outline-none"
        />
        <p className="whitespace-nowrap text-xs text-ink-500">
          {filtered.length}건 (전체 {allReservations.length}건) · 행을 누르면 바로 수정할 수 있습니다
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[1150px] text-sm">
          <thead>
            <tr className="whitespace-nowrap bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
              <th className="px-4 py-2 font-medium">상태</th>
              <th className="px-4 py-2 font-medium">채널</th>
              <th className="px-4 py-2 font-medium">투어</th>
              <th className="px-4 py-2 font-medium">투어일</th>
              <th className="px-4 py-2 font-medium">이름</th>
              <th className="px-4 py-2 font-medium">이메일</th>
              <th className="px-4 py-2 font-medium">연락처</th>
              <th className="px-4 py-2 font-medium">사전예약금(₩)</th>
              <th className="px-4 py-2 font-medium">현장지불금(€)</th>
              <th className="px-4 py-2 font-medium">인원</th>
              <th className="px-4 py-2 font-medium">등록일</th>
              <th className="px-4 py-2 font-medium">정산</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-6 text-center text-sm text-ink-500">
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const status = STATUS_LABEL[r.status];
                return (
                  <tr
                    key={r.id}
                    onClick={() => openEditForm(r)}
                    className="cursor-pointer whitespace-nowrap border-t border-line hover:bg-rose-100"
                  >
                    <td className="px-4 py-2.5">
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </td>
                    <td className="px-4 py-2.5 text-ink-700">
                      {r.channel === "partner_agency" ? r.partnerName : "자사"}
                    </td>
                    <td className="px-4 py-2.5 text-ink-900">{r.tourName}</td>
                    <td className="px-4 py-2.5 font-mono text-ink-700">{r.date}</td>
                    <td className="px-4 py-2.5 text-ink-700">{r.contactName}</td>
                    <td className="px-4 py-2.5 font-mono text-ink-700">{r.email}</td>
                    <td className="px-4 py-2.5 font-mono text-ink-700">{r.phone}</td>
                    <td className="px-4 py-2.5 font-mono text-ink-700">₩{r.advanceDepositKrw.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-ink-700">€{r.onSitePaymentEur.toFixed(1)}</td>
                    <td className="px-4 py-2.5 font-mono text-ink-700">{r.headcount}</td>
                    <td className="px-4 py-2.5 font-mono text-ink-500">{r.registeredAt}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill tone={r.settled ? "good" : "neutral"}>
                        {r.settled ? "정산완료" : "미정산"}
                      </StatusPill>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={closeForm}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-md bg-surface p-5 shadow-[0_1px_2px_rgba(28,29,36,0.06),0_6px_20px_-10px_rgba(28,29,36,0.18)]"
          >
            <p className="text-base font-semibold text-ink-900">
              {form.editingId ? "예약 수정" : "예약 추가"}
            </p>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-semibold text-ink-900">예약 기본 정보</legend>

              <label className="flex flex-col gap-1 text-sm text-ink-700">
                상태
                <select
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value as ReservationStatus)}
                  className="rounded-sm border border-line px-2 py-1.5 text-sm focus:border-line-strong focus:outline-none"
                >
                  {(Object.keys(STATUS_LABEL) as ReservationStatus[]).map((key) => (
                    <option key={key} value={key}>
                      {STATUS_LABEL[key].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-ink-700">
                투어명
                <select
                  value={form.tourId}
                  onChange={(e) => updateField("tourId", e.target.value)}
                  className="rounded-sm border border-line px-2 py-1.5 text-sm focus:border-line-strong focus:outline-none"
                >
                  {SAMPLE_TOURS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-ink-700">
                투어일
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className="rounded-sm border border-line px-2 py-1.5 text-sm focus:border-line-strong focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-ink-700">
                신청자이름
                <input
                  type="text"
                  required
                  value={form.contactName}
                  onChange={(e) => updateField("contactName", e.target.value)}
                  className="rounded-sm border border-line px-2 py-1.5 text-sm focus:border-line-strong focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-ink-700">
                신청자 이메일
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="rounded-sm border border-line px-2 py-1.5 text-sm focus:border-line-strong focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-ink-700">
                신청자 연락처
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="rounded-sm border border-line px-2 py-1.5 text-sm focus:border-line-strong focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm text-ink-700">
                  사전예약금(₩)
                  <input
                    type="number"
                    min={0}
                    value={form.advanceDepositKrw}
                    onChange={(e) => updateField("advanceDepositKrw", e.target.value)}
                    className="rounded-sm border border-line px-2 py-1.5 text-sm font-mono focus:border-line-strong focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-ink-700">
                  현장지불금(€)
                  <input
                    type="number"
                    min={0}
                    value={form.onSitePaymentEur}
                    onChange={(e) => updateField("onSitePaymentEur", e.target.value)}
                    className="rounded-sm border border-line px-2 py-1.5 text-sm font-mono focus:border-line-strong focus:outline-none"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm text-ink-700">
                총 인원
                <input
                  type="number"
                  min={1}
                  value={form.headcount}
                  onChange={(e) => updateField("headcount", e.target.value)}
                  className="w-24 rounded-sm border border-line px-2 py-1.5 text-sm font-mono focus:border-line-strong focus:outline-none"
                />
              </label>

              <div>
                <p className="mb-1.5 text-sm text-ink-700">상세 인원</p>
                <div className="flex flex-col gap-1.5">
                  {form.detailBreakdown.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        value={entry.label}
                        onChange={(e) => updateEntry("detailBreakdown", idx, "label", e.target.value)}
                        placeholder="구분 (예: 성인)"
                        className="flex-1 rounded-sm border border-line px-2 py-1 text-sm focus:border-line-strong focus:outline-none"
                      />
                      <input
                        value={entry.value}
                        onChange={(e) => updateEntry("detailBreakdown", idx, "value", e.target.value)}
                        placeholder="인원수"
                        inputMode="numeric"
                        className="w-20 rounded-sm border border-line px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                      />
                      {form.detailBreakdown.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntry("detailBreakdown", idx)}
                          aria-label="행 삭제"
                          className="text-ink-500 hover:text-critical"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addEntry("detailBreakdown")}
                  className="mt-1.5 rounded-sm border border-line px-2.5 py-1 text-xs text-ink-700 hover:bg-paper"
                >
                  행 추가
                </button>
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3 border-t border-line pt-4">
              <legend className="mb-1 text-sm font-semibold text-ink-900">예약 기타정보</legend>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm text-ink-700">
                  채널
                  <select
                    value={form.channel}
                    onChange={(e) => updateField("channel", e.target.value as ReservationChannel)}
                    className="rounded-sm border border-line px-2 py-1.5 text-sm focus:border-line-strong focus:outline-none"
                  >
                    <option value="staff_entry">자사</option>
                    <option value="partner_agency">파트너 대행사</option>
                  </select>
                </label>
                {form.channel === "partner_agency" && (
                  <label className="flex flex-col gap-1 text-sm text-ink-700">
                    파트너사
                    <input
                      type="text"
                      value={form.partnerName}
                      onChange={(e) => updateField("partnerName", e.target.value)}
                      className="rounded-sm border border-line px-2 py-1.5 text-sm focus:border-line-strong focus:outline-none"
                    />
                  </label>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={form.earlyBirdDiscount}
                  onChange={(e) => updateField("earlyBirdDiscount", e.target.checked)}
                  className="h-3.5 w-3.5 accent-rose-600"
                />
                얼리버드 할인 적용
              </label>
            </fieldset>

            <fieldset className="flex flex-col gap-3 border-t border-line pt-4">
              <legend className="mb-1 text-sm font-semibold text-ink-900">예약 옵션 정보</legend>

              <div className="flex flex-col gap-1.5">
                {form.optionItems.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      value={entry.label}
                      onChange={(e) => updateEntry("optionItems", idx, "label", e.target.value)}
                      placeholder="옵션 항목 (예: 구엘공원)"
                      className="flex-1 rounded-sm border border-line px-2 py-1 text-sm focus:border-line-strong focus:outline-none"
                    />
                    <input
                      value={entry.value}
                      onChange={(e) => updateEntry("optionItems", idx, "value", e.target.value)}
                      placeholder="금액"
                      inputMode="numeric"
                      className="w-24 rounded-sm border border-line px-2 py-1 text-sm font-mono focus:border-line-strong focus:outline-none"
                    />
                    {form.optionItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEntry("optionItems", idx)}
                        aria-label="행 삭제"
                        className="text-ink-500 hover:text-critical"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addEntry("optionItems")}
                className="self-start rounded-sm border border-line px-2.5 py-1 text-xs text-ink-700 hover:bg-paper"
              >
                행 추가
              </button>

              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">옵션 지불 금액 합계</span>
                <span className="font-mono text-ink-900">{optionTotal.toLocaleString()}</span>
              </div>
            </fieldset>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-sm bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                {form.editingId ? "수정하기" : "추가하기"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 rounded-sm border border-line py-2 text-sm text-ink-700 hover:bg-paper"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
