"use client";

import { useEffect, useState } from "react";
import {
  ADDED_GUIDE_PAYSLIPS_STORAGE_KEY,
  ADDED_GUIDE_SETTLEMENTS_STORAGE_KEY,
  ADDED_STAFF_STORAGE_KEY,
  GUIDE_PAYSLIP_COMPLETED_STORAGE_KEY,
  GUIDE_PAYSLIP_EDITS_STORAGE_KEY,
  GUIDE_SETTLEMENT_COMPLETED_STORAGE_KEY,
  GUIDE_SETTLEMENT_EDITS_STORAGE_KEY,
  SAMPLE_GUIDE_PAYSLIPS,
  SAMPLE_GUIDE_SETTLEMENTS,
  SAMPLE_STAFF,
  STAFF_EDITS_STORAGE_KEY,
  STAFF_STATUS_STORAGE_KEY,
  type GuidePayslip,
  type GuideSettlementSheet,
  type PayslipLineItem,
  type SettlementLineItem,
  type Staff,
  type StaffStatus,
} from "@/lib/sample-data";

type Category = "payslip" | "settlement";
type DraftItem = { label: string; amount: string };
type SettlementDraft = {
  guideName: string;
  region: string;
  periodStart: string;
  periodEnd: string;
  collectedItems: DraftItem[];
  payoutItems: DraftItem[];
};
type PayslipDraft = {
  guideName: string;
  region: string;
  payMonth: string;
  payDate: string;
  paymentItems: DraftItem[];
  deductionItems: DraftItem[];
};

function blankItem(): DraftItem {
  return { label: "", amount: "" };
}

function formatPeriodRange(start: string, end: string) {
  if (!start || !end) return "기간 미정";
  const [sy, sm, sd] = start.split("-");
  const [ey, em, ed] = end.split("-");
  return sy === ey ? `${sy}년 ${sm}월${sd}일~${em}월${ed}일` : `${sy}년 ${sm}월${sd}일~${ey}년 ${em}월${ed}일`;
}

function formatPayMonth(payMonth: string) {
  if (!payMonth) return "월 미정";
  const [y, m] = payMonth.split("-");
  return `${y}년 ${m}월`;
}

export default function AdminGuideSettlementsPage() {
  const [hydrated, setHydrated] = useState(false);

  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [addedStaff, setAddedStaff] = useState<Staff[]>([]);
  const [staffEdits, setStaffEdits] = useState<Record<string, Staff>>({});
  const [staffStatus, setStaffStatus] = useState<Record<string, StaffStatus>>({});

  const [addedSheets, setAddedSheets] = useState<GuideSettlementSheet[]>([]);
  const [sheetEdits, setSheetEdits] = useState<Record<string, GuideSettlementSheet>>({});
  const [settlementCompleted, setSettlementCompleted] = useState<Record<string, boolean>>({});
  const [sheetEditingId, setSheetEditingId] = useState<string | "new" | null>(null);
  const [sheetDraft, setSheetDraft] = useState<SettlementDraft | null>(null);
  const [sheetFormError, setSheetFormError] = useState("");

  const [addedPayslips, setAddedPayslips] = useState<GuidePayslip[]>([]);
  const [payslipEdits, setPayslipEdits] = useState<Record<string, GuidePayslip>>({});
  const [payslipCompleted, setPayslipCompleted] = useState<Record<string, boolean>>({});
  const [payslipEditingId, setPayslipEditingId] = useState<string | "new" | null>(null);
  const [payslipDraft, setPayslipDraft] = useState<PayslipDraft | null>(null);
  const [payslipFormError, setPayslipFormError] = useState("");

  useEffect(() => {
    try {
      const savedAddedStaff = localStorage.getItem(ADDED_STAFF_STORAGE_KEY);
      if (savedAddedStaff) setAddedStaff(JSON.parse(savedAddedStaff));
      const savedStaffEdits = localStorage.getItem(STAFF_EDITS_STORAGE_KEY);
      if (savedStaffEdits) setStaffEdits(JSON.parse(savedStaffEdits));
      const savedStaffStatus = localStorage.getItem(STAFF_STATUS_STORAGE_KEY);
      if (savedStaffStatus) setStaffStatus(JSON.parse(savedStaffStatus));
      const savedSheets = localStorage.getItem(ADDED_GUIDE_SETTLEMENTS_STORAGE_KEY);
      if (savedSheets) setAddedSheets(JSON.parse(savedSheets));
      const savedSheetEdits = localStorage.getItem(GUIDE_SETTLEMENT_EDITS_STORAGE_KEY);
      if (savedSheetEdits) setSheetEdits(JSON.parse(savedSheetEdits));
      const savedSheetsCompleted = localStorage.getItem(GUIDE_SETTLEMENT_COMPLETED_STORAGE_KEY);
      if (savedSheetsCompleted) setSettlementCompleted(JSON.parse(savedSheetsCompleted));
      const savedPayslips = localStorage.getItem(ADDED_GUIDE_PAYSLIPS_STORAGE_KEY);
      if (savedPayslips) setAddedPayslips(JSON.parse(savedPayslips));
      const savedPayslipEdits = localStorage.getItem(GUIDE_PAYSLIP_EDITS_STORAGE_KEY);
      if (savedPayslipEdits) setPayslipEdits(JSON.parse(savedPayslipEdits));
      const savedPayslipsCompleted = localStorage.getItem(GUIDE_PAYSLIP_COMPLETED_STORAGE_KEY);
      if (savedPayslipsCompleted) setPayslipCompleted(JSON.parse(savedPayslipsCompleted));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 표본 데이터만으로 계속 진행
    }
    setHydrated(true);
  }, []);

  const allSheets = [...SAMPLE_GUIDE_SETTLEMENTS.map((s) => sheetEdits[s.id] ?? s), ...addedSheets];
  const allPayslips = [...SAMPLE_GUIDE_PAYSLIPS.map((p) => payslipEdits[p.id] ?? p), ...addedPayslips];

  // 계정 화면(재직 중/이전 직원)과 같은 데이터를 봐서, 그만둔 가이드도 목록에서
  // 아예 사라지지 않고 "이전 직원" 쪽에 남는다 — 그래야 그 가이드 이름으로
  // 쌓인 정산서·급여명세서를 계속 찾아볼 수 있다(2026-09-13 확인).
  // 오버라이드를 통째로 쓰지 않고 원본 위에 덮어써서 병합한다 — 새 필드가
  // 빠진 예전 오버라이드가 와도 원본 값을 지켜준다.
  const allStaff = [...SAMPLE_STAFF.map((s) => ({ ...s, ...staffEdits[s.id] })), ...addedStaff].map((s) => ({
    ...s,
    status: staffStatus[s.id] ?? s.status,
  }));
  const activeGuideNames = allStaff.filter((s) => s.role === "guide" && s.status === "active").map((s) => s.name);
  const formerGuideNames = allStaff.filter((s) => s.role === "guide" && s.status === "former").map((s) => s.name);

  function countSheets(name: string) {
    const list = allSheets.filter((s) => s.guideName === name);
    const completed = list.filter((s) => settlementCompleted[s.id]).length;
    return { total: list.length, pending: list.length - completed };
  }

  function countPayslips(name: string) {
    const list = allPayslips.filter((p) => p.guideName === name);
    const completed = list.filter((p) => payslipCompleted[p.id]).length;
    return { total: list.length, pending: list.length - completed };
  }

  // 미처리 건이 남아있을 때만 눈에 띄게 빨간색 — 그 외(0건, 또는 다 처리됨)엔
  // 그냥 기본 글씨색으로 둔다.
  function countColorClass(count: { total: number; pending: number }) {
    return count.pending > 0 ? "text-critical" : "text-ink-900";
  }

  function backToGuideList() {
    setSelectedGuide(null);
    setSelectedCategory(null);
    setSheetEditingId(null);
    setSheetDraft(null);
    setPayslipEditingId(null);
    setPayslipDraft(null);
  }

  function backToCategoryList() {
    setSelectedCategory(null);
    setSheetEditingId(null);
    setSheetDraft(null);
    setPayslipEditingId(null);
    setPayslipDraft(null);
  }

  // ---- 정산서 ----

  function persistSheets(next: GuideSettlementSheet[]) {
    setAddedSheets(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(ADDED_GUIDE_SETTLEMENTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지 — 새로고침하면 초기화될 수 있음을 감수
    }
  }

  function toggleSettlementCompleted(id: string) {
    const next = { ...settlementCompleted, [id]: !settlementCompleted[id] };
    setSettlementCompleted(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(GUIDE_SETTLEMENT_COMPLETED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지
    }
  }

  function startNewSheet(guideName: string) {
    setSheetFormError("");
    setSheetDraft({
      guideName,
      region: "",
      periodStart: "",
      periodEnd: "",
      collectedItems: [blankItem()],
      payoutItems: [blankItem()],
    });
    setSheetEditingId("new");
  }

  function startEditSheet(sheet: GuideSettlementSheet) {
    setSheetFormError("");
    setSheetDraft({
      guideName: sheet.guideName,
      region: sheet.region,
      periodStart: sheet.periodStart,
      periodEnd: sheet.periodEnd,
      collectedItems: sheet.collectedItems.map((i) => ({ label: i.label, amount: String(i.amount) })),
      payoutItems: sheet.payoutItems.map((i) => ({ label: i.label, amount: String(i.amount) })),
    });
    setSheetEditingId(sheet.id);
  }

  function cancelSheetEdit() {
    setSheetEditingId(null);
    setSheetDraft(null);
    setSheetFormError("");
  }

  function updateSheetField(field: "region" | "periodStart" | "periodEnd", value: string) {
    setSheetDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function updateSheetItem(kind: "collectedItems" | "payoutItems", idx: number, field: keyof DraftItem, value: string) {
    setSheetDraft((prev) => {
      if (!prev) return prev;
      const items = [...prev[kind]];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, [kind]: items };
    });
  }

  function addSheetItem(kind: "collectedItems" | "payoutItems") {
    setSheetDraft((prev) => (prev ? { ...prev, [kind]: [...prev[kind], blankItem()] } : prev));
  }

  function removeSheetItem(kind: "collectedItems" | "payoutItems", idx: number) {
    setSheetDraft((prev) => (prev ? { ...prev, [kind]: prev[kind].filter((_, i) => i !== idx) } : prev));
  }

  function persistSheetEdits(next: Record<string, GuideSettlementSheet>) {
    setSheetEdits(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(GUIDE_SETTLEMENT_EDITS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지
    }
  }

  function saveSheetDraft() {
    if (!sheetDraft || !sheetEditingId) return;
    if (!sheetDraft.periodStart || !sheetDraft.periodEnd) {
      setSheetFormError("정산 기간(시작일·종료일)을 입력해주세요.");
      return;
    }
    const toItems = (items: DraftItem[]): SettlementLineItem[] =>
      items.filter((i) => i.label.trim()).map((i) => ({ label: i.label.trim(), amount: Number(i.amount) || 0 }));

    const sheet: GuideSettlementSheet = {
      id: sheetEditingId === "new" ? `gs-${Date.now()}` : sheetEditingId,
      guideName: sheetDraft.guideName,
      region: sheetDraft.region.trim(),
      periodStart: sheetDraft.periodStart,
      periodEnd: sheetDraft.periodEnd,
      collectedItems: toItems(sheetDraft.collectedItems),
      payoutItems: toItems(sheetDraft.payoutItems),
    };
    if (sheetEditingId === "new") {
      persistSheets([...addedSheets, sheet]);
    } else if (addedSheets.some((s) => s.id === sheetEditingId)) {
      persistSheets(addedSheets.map((s) => (s.id === sheetEditingId ? sheet : s)));
    } else {
      // 표본 정산서를 고친 것 — 상수 자체는 못 바꾸니 오버라이드 맵에 저장한다.
      persistSheetEdits({ ...sheetEdits, [sheetEditingId]: sheet });
    }
    cancelSheetEdit();
  }

  function deleteSheet(id: string) {
    persistSheets(addedSheets.filter((s) => s.id !== id));
  }

  function revertSheetEdit(id: string) {
    const next = { ...sheetEdits };
    delete next[id];
    persistSheetEdits(next);
  }

  // ---- 급여명세서 ----

  function persistPayslips(next: GuidePayslip[]) {
    setAddedPayslips(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(ADDED_GUIDE_PAYSLIPS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지 — 새로고침하면 초기화될 수 있음을 감수
    }
  }

  function togglePayslipCompleted(id: string) {
    const next = { ...payslipCompleted, [id]: !payslipCompleted[id] };
    setPayslipCompleted(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(GUIDE_PAYSLIP_COMPLETED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지
    }
  }

  function startNewPayslip(guideName: string) {
    setPayslipFormError("");
    setPayslipDraft({
      guideName,
      region: "",
      payMonth: "",
      payDate: "",
      paymentItems: [blankItem()],
      deductionItems: [blankItem()],
    });
    setPayslipEditingId("new");
  }

  function startEditPayslip(payslip: GuidePayslip) {
    setPayslipFormError("");
    setPayslipDraft({
      guideName: payslip.guideName,
      region: payslip.region,
      payMonth: payslip.payMonth,
      payDate: payslip.payDate,
      paymentItems: payslip.paymentItems.map((i) => ({ label: i.label, amount: String(i.amount) })),
      deductionItems: payslip.deductionItems.map((i) => ({ label: i.label, amount: String(i.amount) })),
    });
    setPayslipEditingId(payslip.id);
  }

  function cancelPayslipEdit() {
    setPayslipEditingId(null);
    setPayslipDraft(null);
    setPayslipFormError("");
  }

  function updatePayslipField(field: "region" | "payMonth" | "payDate", value: string) {
    setPayslipDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function updatePayslipItem(kind: "paymentItems" | "deductionItems", idx: number, field: keyof DraftItem, value: string) {
    setPayslipDraft((prev) => {
      if (!prev) return prev;
      const items = [...prev[kind]];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, [kind]: items };
    });
  }

  function addPayslipItem(kind: "paymentItems" | "deductionItems") {
    setPayslipDraft((prev) => (prev ? { ...prev, [kind]: [...prev[kind], blankItem()] } : prev));
  }

  function removePayslipItem(kind: "paymentItems" | "deductionItems", idx: number) {
    setPayslipDraft((prev) => (prev ? { ...prev, [kind]: prev[kind].filter((_, i) => i !== idx) } : prev));
  }

  function persistPayslipEdits(next: Record<string, GuidePayslip>) {
    setPayslipEdits(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(GUIDE_PAYSLIP_EDITS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지
    }
  }

  function savePayslipDraft() {
    if (!payslipDraft || !payslipEditingId) return;
    if (!payslipDraft.payMonth) {
      setPayslipFormError("급여 대상 월을 입력해주세요.");
      return;
    }
    const toItems = (items: DraftItem[]): PayslipLineItem[] =>
      items.filter((i) => i.label.trim()).map((i) => ({ label: i.label.trim(), amount: Number(i.amount) || 0 }));

    const payslip: GuidePayslip = {
      id: payslipEditingId === "new" ? `ps-${Date.now()}` : payslipEditingId,
      guideName: payslipDraft.guideName,
      region: payslipDraft.region.trim(),
      payMonth: payslipDraft.payMonth,
      payDate: payslipDraft.payDate,
      paymentItems: toItems(payslipDraft.paymentItems),
      deductionItems: toItems(payslipDraft.deductionItems),
    };
    if (payslipEditingId === "new") {
      persistPayslips([...addedPayslips, payslip]);
    } else if (addedPayslips.some((p) => p.id === payslipEditingId)) {
      persistPayslips(addedPayslips.map((p) => (p.id === payslipEditingId ? payslip : p)));
    } else {
      // 표본 급여명세서를 고친 것 — 상수 자체는 못 바꾸니 오버라이드 맵에 저장한다.
      persistPayslipEdits({ ...payslipEdits, [payslipEditingId]: payslip });
    }
    cancelPayslipEdit();
  }

  function deletePayslip(id: string) {
    persistPayslips(addedPayslips.filter((p) => p.id !== id));
  }

  function revertPayslipEdit(id: string) {
    const next = { ...payslipEdits };
    delete next[id];
    persistPayslipEdits(next);
  }

  // ---- 렌더 ----

  function renderItemEditor(
    items: DraftItem[],
    onChange: (idx: number, field: keyof DraftItem, value: string) => void,
    onAdd: () => void,
    onRemove: (idx: number) => void,
    placeholder: string,
  ) {
    return (
      <div className="flex flex-col gap-1.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <input
              value={item.label}
              onChange={(e) => onChange(idx, "label", e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-sm border border-line px-2 py-1 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
            />
            <input
              value={item.amount}
              onChange={(e) => onChange(idx, "amount", e.target.value)}
              placeholder="금액"
              type="number"
              className="w-24 rounded-sm border border-line px-2 py-1 text-right font-mono text-sm text-ink-900 focus:border-line-strong focus:outline-none"
            />
            {items.length > 1 && (
              <button type="button" onClick={() => onRemove(idx)} aria-label="항목 삭제" className="text-ink-500 hover:text-critical">
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={onAdd} className="self-start rounded-sm border border-line px-2 py-1 text-xs text-ink-700 hover:bg-paper">
          + 항목 추가
        </button>
      </div>
    );
  }

  function renderCompletedCheckbox(checked: boolean, onToggle: () => void) {
    return (
      <label className="flex items-center gap-1.5 text-xs text-ink-700">
        처리완료
        <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 accent-good" />
      </label>
    );
  }

  function renderSheetCard(sheet: GuideSettlementSheet) {
    const totalCollected = sheet.collectedItems.reduce((sum, i) => sum + i.amount, 0);
    const totalPayout = sheet.payoutItems.reduce((sum, i) => sum + i.amount, 0);
    const finalAmount = totalCollected - totalPayout;
    const rowCount = Math.max(sheet.collectedItems.length, sheet.payoutItems.length, 1);
    const isCompleted = Boolean(settlementCompleted[sheet.id]);
    const isAdded = addedSheets.some((s) => s.id === sheet.id);
    const isEditedSeed = !isAdded && Boolean(sheetEdits[sheet.id]);

    return (
      <div
        key={sheet.id}
        className={`rounded-md border p-4 ${isCompleted ? "border-good bg-good-wash" : "border-line bg-surface"}`}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-base text-ink-900">{formatPeriodRange(sheet.periodStart, sheet.periodEnd)} 정산서</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs">
              <button type="button" onClick={() => startEditSheet(sheet)} className="text-ink-500 hover:text-rose-700">
                수정
              </button>
              {isAdded && (
                <button type="button" onClick={() => deleteSheet(sheet.id)} className="text-ink-500 hover:text-critical">
                  삭제
                </button>
              )}
              {isEditedSeed && (
                <button type="button" onClick={() => revertSheetEdit(sheet.id)} className="text-ink-500 hover:text-rose-700">
                  원본으로
                </button>
              )}
              {!isAdded && !isEditedSeed && <span className="text-ink-500">예시 데이터</span>}
            </div>
            {renderCompletedCheckbox(isCompleted, () => toggleSettlementCompleted(sheet.id))}
          </div>
        </div>
        <p className="mt-1 text-sm text-ink-700">
          성명: {sheet.guideName} · 지역: {sheet.region || "—"}
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
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
                    <td className="py-1.5 pr-3 text-right font-mono text-ink-900">{c ? c.amount.toLocaleString() : ""}</td>
                    <td className="border-l border-line py-1.5 pr-3 pl-3 text-ink-700">{p?.label ?? ""}</td>
                    <td className="py-1.5 text-right font-mono text-ink-900">{p ? p.amount.toLocaleString() : ""}</td>
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
    );
  }

  function renderPayslipCard(payslip: GuidePayslip) {
    const totalPayment = payslip.paymentItems.reduce((sum, i) => sum + i.amount, 0);
    const totalDeduction = payslip.deductionItems.reduce((sum, i) => sum + i.amount, 0);
    const finalAmount = totalPayment - totalDeduction;
    const rowCount = Math.max(payslip.paymentItems.length, payslip.deductionItems.length, 1);
    const isCompleted = Boolean(payslipCompleted[payslip.id]);
    const isAdded = addedPayslips.some((p) => p.id === payslip.id);
    const isEditedSeed = !isAdded && Boolean(payslipEdits[payslip.id]);

    return (
      <div
        key={payslip.id}
        className={`rounded-md border p-4 ${isCompleted ? "border-good bg-good-wash" : "border-line bg-surface"}`}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-base text-ink-900">{formatPayMonth(payslip.payMonth)} 급여명세서</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs">
              <button type="button" onClick={() => startEditPayslip(payslip)} className="text-ink-500 hover:text-rose-700">
                수정
              </button>
              {isAdded && (
                <button type="button" onClick={() => deletePayslip(payslip.id)} className="text-ink-500 hover:text-critical">
                  삭제
                </button>
              )}
              {isEditedSeed && (
                <button type="button" onClick={() => revertPayslipEdit(payslip.id)} className="text-ink-500 hover:text-rose-700">
                  원본으로
                </button>
              )}
              {!isAdded && !isEditedSeed && <span className="text-ink-500">예시 데이터</span>}
            </div>
            {renderCompletedCheckbox(isCompleted, () => togglePayslipCompleted(payslip.id))}
          </div>
        </div>
        <p className="mt-1 text-sm text-ink-700">
          성명: {payslip.guideName} · 지역: {payslip.region || "—"} · 지급일: {payslip.payDate || "—"}
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
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
                    <td className="py-1.5 text-right font-mono text-ink-900">{ded ? ded.amount.toLocaleString() : ""}</td>
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
    );
  }

  function renderGuideCard(name: string, isFormer = false) {
    const payslipCount = countPayslips(name);
    const sheetCount = countSheets(name);
    return (
      <button
        key={name}
        type="button"
        onClick={() => setSelectedGuide(name)}
        className={`flex flex-col items-start gap-1 rounded-md border p-4 text-left hover:border-rose-600 hover:bg-rose-100 ${
          isFormer ? "border-line bg-paper" : "border-line bg-surface"
        }`}
      >
        <span className="font-display text-base text-ink-900">{name}</span>
        <span className="text-xs text-ink-500">
          급여 미처리{" "}
          <span className={`font-mono ${countColorClass(payslipCount)}`}>
            {payslipCount.pending}/{payslipCount.total}
          </span>{" "}
          · 정산 미처리{" "}
          <span className={`font-mono ${countColorClass(sheetCount)}`}>
            {sheetCount.pending}/{sheetCount.total}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">가이드정산및급여</h1>
        <p className="text-xs text-ink-500">가이드별 급여·현금 정산 · 처리완료 체크 시 초록색으로 표시</p>
      </div>

      {selectedGuide === null && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink-900">재직 중</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {activeGuideNames.map((name) => renderGuideCard(name))}
            </div>
          </div>
          {formerGuideNames.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink-900">이전 직원</p>
              <p className="text-xs text-ink-500">
                그만둔 가이드도 이름으로 쌓인 정산서·급여명세서를 계속 볼 수 있도록 목록에 남겨둡니다.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {formerGuideNames.map((name) => renderGuideCard(name, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedGuide !== null && selectedCategory === null && (
        <div className="flex flex-col gap-4">
          <button type="button" onClick={backToGuideList} className="self-start text-xs text-ink-500 hover:text-rose-700">
            ← 가이드 목록으로
          </button>
          <h2 className="font-display text-lg text-ink-900">{selectedGuide}</h2>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <button
              type="button"
              onClick={() => setSelectedCategory("payslip")}
              className="flex flex-col items-start gap-1 rounded-md border border-line bg-surface p-4 text-left hover:border-rose-600 hover:bg-rose-100"
            >
              <span className="font-display text-base text-ink-900">급여</span>
              <span className="text-xs text-ink-500">
                미처리{" "}
                <span className={`font-mono ${countColorClass(countPayslips(selectedGuide))}`}>
                  {countPayslips(selectedGuide).pending}/{countPayslips(selectedGuide).total}
                </span>
                건
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("settlement")}
              className="flex flex-col items-start gap-1 rounded-md border border-line bg-surface p-4 text-left hover:border-rose-600 hover:bg-rose-100"
            >
              <span className="font-display text-base text-ink-900">정산</span>
              <span className="text-xs text-ink-500">
                미처리{" "}
                <span className={`font-mono ${countColorClass(countSheets(selectedGuide))}`}>
                  {countSheets(selectedGuide).pending}/{countSheets(selectedGuide).total}
                </span>
                건
              </span>
            </button>
          </div>
        </div>
      )}

      {selectedGuide !== null && selectedCategory === "payslip" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={backToCategoryList} className="text-xs text-ink-500 hover:text-rose-700">
              ← {selectedGuide} 카테고리로
            </button>
            <button
              type="button"
              onClick={() => startNewPayslip(selectedGuide)}
              className="rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
            >
              + 새 급여명세서 추가
            </button>
          </div>
          <h2 className="font-display text-lg text-ink-900">{selectedGuide} · 급여</h2>

          {payslipEditingId && payslipDraft && (
            <div className="rounded-md border border-rose-600 bg-surface p-4">
              <p className="text-sm font-semibold text-ink-900">{payslipEditingId === "new" ? "새 급여명세서" : "급여명세서 수정"}</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs text-ink-500">
                  지역
                  <input
                    value={payslipDraft.region}
                    onChange={(e) => updatePayslipField("region", e.target.value)}
                    placeholder="예: 바르셀로나"
                    className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-ink-500">
                  급여 대상 월
                  <input
                    type="month"
                    value={payslipDraft.payMonth}
                    onChange={(e) => updatePayslipField("payMonth", e.target.value)}
                    className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-ink-500">
                  지급일
                  <input
                    type="date"
                    value={payslipDraft.payDate}
                    onChange={(e) => updatePayslipField("payDate", e.target.value)}
                    className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-ink-700">지급항목 · 지급액 (급여, 후기, 통신비 등)</p>
                  <div className="mt-1">
                    {renderItemEditor(
                      payslipDraft.paymentItems,
                      (idx, field, value) => updatePayslipItem("paymentItems", idx, field, value),
                      () => addPayslipItem("paymentItems"),
                      (idx) => removePayslipItem("paymentItems", idx),
                      "예: 급여",
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-700">공제항목 · 공제액 (세금, 이체된 금액 등)</p>
                  <div className="mt-1">
                    {renderItemEditor(
                      payslipDraft.deductionItems,
                      (idx, field, value) => updatePayslipItem("deductionItems", idx, field, value),
                      () => addPayslipItem("deductionItems"),
                      (idx) => removePayslipItem("deductionItems", idx),
                      "예: 세금",
                    )}
                  </div>
                </div>
              </div>

              {payslipFormError && <p className="mt-2 text-sm text-critical">{payslipFormError}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={savePayslipDraft} className="rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700">
                  저장
                </button>
                <button type="button" onClick={cancelPayslipEdit} className="rounded-sm border border-line px-3 py-1.5 text-xs text-ink-700 hover:bg-paper">
                  취소
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {allPayslips
              .filter((p) => p.guideName === selectedGuide)
              .sort((a, b) => (a.payMonth < b.payMonth ? 1 : -1))
              .map((payslip) => renderPayslipCard(payslip))}
            {allPayslips.filter((p) => p.guideName === selectedGuide).length === 0 && (
              <p className="text-sm text-ink-500">아직 만들어진 급여명세서가 없습니다.</p>
            )}
          </div>
        </div>
      )}

      {selectedGuide !== null && selectedCategory === "settlement" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={backToCategoryList} className="text-xs text-ink-500 hover:text-rose-700">
              ← {selectedGuide} 카테고리로
            </button>
            <button
              type="button"
              onClick={() => startNewSheet(selectedGuide)}
              className="rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
            >
              + 새 정산서 추가
            </button>
          </div>
          <h2 className="font-display text-lg text-ink-900">{selectedGuide} · 정산서</h2>

          {sheetEditingId && sheetDraft && (
            <div className="rounded-md border border-rose-600 bg-surface p-4">
              <p className="text-sm font-semibold text-ink-900">{sheetEditingId === "new" ? "새 정산서" : "정산서 수정"}</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs text-ink-500">
                  지역
                  <input
                    value={sheetDraft.region}
                    onChange={(e) => updateSheetField("region", e.target.value)}
                    placeholder="예: 바르셀로나"
                    className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-ink-500">
                  시작일
                  <input
                    type="date"
                    value={sheetDraft.periodStart}
                    onChange={(e) => updateSheetField("periodStart", e.target.value)}
                    className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-ink-500">
                  종료일
                  <input
                    type="date"
                    value={sheetDraft.periodEnd}
                    onChange={(e) => updateSheetField("periodEnd", e.target.value)}
                    className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-ink-700">정산 해당 날짜 · 정산금 (가이드가 갖고 있는 현금)</p>
                  <div className="mt-1">
                    {renderItemEditor(
                      sheetDraft.collectedItems,
                      (idx, field, value) => updateSheetItem("collectedItems", idx, field, value),
                      () => addSheetItem("collectedItems"),
                      (idx) => removeSheetItem("collectedItems", idx),
                      "예: 7일 티켓비",
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-700">지급 항목 · 금액 (가이드에게 돌려줄 경비)</p>
                  <div className="mt-1">
                    {renderItemEditor(
                      sheetDraft.payoutItems,
                      (idx, field, value) => updateSheetItem("payoutItems", idx, field, value),
                      () => addSheetItem("payoutItems"),
                      (idx) => removeSheetItem("payoutItems", idx),
                      "예: 7일 로컬비",
                    )}
                  </div>
                </div>
              </div>

              {sheetFormError && <p className="mt-2 text-sm text-critical">{sheetFormError}</p>}

              <div className="mt-3 flex gap-2">
                <button type="button" onClick={saveSheetDraft} className="rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700">
                  저장
                </button>
                <button type="button" onClick={cancelSheetEdit} className="rounded-sm border border-line px-3 py-1.5 text-xs text-ink-700 hover:bg-paper">
                  취소
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {allSheets
              .filter((s) => s.guideName === selectedGuide)
              .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1))
              .map((sheet) => renderSheetCard(sheet))}
            {allSheets.filter((s) => s.guideName === selectedGuide).length === 0 && (
              <p className="text-sm text-ink-500">아직 만들어진 정산서가 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
