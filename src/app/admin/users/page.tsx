"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import {
  ADDED_STAFF_STORAGE_KEY,
  SAMPLE_STAFF,
  STAFF_EDITS_STORAGE_KEY,
  STAFF_STATUS_STORAGE_KEY,
  type Staff,
  type StaffRole,
  type StaffStatus,
} from "@/lib/sample-data";

type DraftStaff = { name: string; role: StaffRole; phone: string; pin: string };

function blankDraft(): DraftStaff {
  return { name: "", role: "guide", phone: "", pin: "" };
}

export default function AdminUsersPage() {
  const [hydrated, setHydrated] = useState(false);
  const [addedStaff, setAddedStaff] = useState<Staff[]>([]);
  const [staffEdits, setStaffEdits] = useState<Record<string, Staff>>({});
  const [staffStatus, setStaffStatus] = useState<Record<string, StaffStatus>>({});

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<DraftStaff | null>(null);
  const [formError, setFormError] = useState("");
  const [dragOverZone, setDragOverZone] = useState<StaffStatus | null>(null);

  useEffect(() => {
    try {
      const savedAdded = localStorage.getItem(ADDED_STAFF_STORAGE_KEY);
      if (savedAdded) setAddedStaff(JSON.parse(savedAdded));
      const savedEdits = localStorage.getItem(STAFF_EDITS_STORAGE_KEY);
      if (savedEdits) setStaffEdits(JSON.parse(savedEdits));
      const savedStatus = localStorage.getItem(STAFF_STATUS_STORAGE_KEY);
      if (savedStatus) setStaffStatus(JSON.parse(savedStatus));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 표본 데이터만으로 계속 진행
    }
    setHydrated(true);
  }, []);

  // 오버라이드를 통째로 쓰지 않고 원본 위에 덮어써서 병합한다 — 예전에(pin
  // 필드가 생기기 전에) 저장된 수정 내역처럼 새 필드가 빠진 오버라이드가
  // 와도 원본 값을 그대로 지켜준다.
  const allStaff = [...SAMPLE_STAFF.map((s) => ({ ...s, ...staffEdits[s.id] })), ...addedStaff].map((s) => ({
    ...s,
    status: staffStatus[s.id] ?? s.status,
  }));
  const activeStaff = allStaff.filter((s) => s.status === "active");
  const formerStaff = allStaff.filter((s) => s.status === "former");

  function persistAdded(next: Staff[]) {
    setAddedStaff(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(ADDED_STAFF_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지
    }
  }

  function persistEdits(next: Record<string, Staff>) {
    setStaffEdits(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(STAFF_EDITS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지
    }
  }

  function persistStatus(next: Record<string, StaffStatus>) {
    setStaffStatus(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(STAFF_STATUS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지
    }
  }

  function setStatus(id: string, status: StaffStatus) {
    persistStatus({ ...staffStatus, [id]: status });
  }

  function startNew() {
    setFormError("");
    setDraft(blankDraft());
    setEditingId("new");
  }

  function startEdit(staff: Staff) {
    setFormError("");
    setDraft({ name: staff.name, role: staff.role, phone: staff.phone, pin: staff.pin });
    setEditingId(staff.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setFormError("");
  }

  function updateDraft(field: keyof DraftStaff, value: string) {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function saveDraft() {
    if (!draft || !editingId) return;
    if (!draft.name.trim()) {
      setFormError("이름을 입력해주세요.");
      return;
    }
    if (draft.role === "guide" && !/^\d{4}$/.test(draft.pin)) {
      setFormError("가이드 로그인 PIN은 숫자 4자리로 입력해주세요.");
      return;
    }
    if (editingId === "new") {
      const staff: Staff = {
        id: `staff-${Date.now()}`,
        name: draft.name.trim(),
        role: draft.role,
        phone: draft.phone.trim(),
        status: "active",
        pin: draft.pin.trim(),
      };
      persistAdded([...addedStaff, staff]);
    } else if (addedStaff.some((s) => s.id === editingId)) {
      persistAdded(
        addedStaff.map((s) =>
          s.id === editingId
            ? { ...s, name: draft.name.trim(), role: draft.role, phone: draft.phone.trim(), pin: draft.pin.trim() }
            : s,
        ),
      );
    } else {
      // 표본 직원 수정 — 상수 자체는 못 바꾸니 오버라이드 맵에 저장한다.
      const original = SAMPLE_STAFF.find((s) => s.id === editingId);
      if (original) {
        persistEdits({
          ...staffEdits,
          [editingId]: {
            ...original,
            name: draft.name.trim(),
            role: draft.role,
            phone: draft.phone.trim(),
            pin: draft.pin.trim(),
          },
        });
      }
    }
    cancelEdit();
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(e: React.DragEvent, zone: StaffStatus) {
    e.preventDefault();
    setDragOverZone(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) setStatus(id, zone);
  }

  function renderForm() {
    if (!editingId || !draft) return null;
    return (
      <div className="rounded-md border border-rose-600 bg-surface p-4">
        <p className="text-sm font-semibold text-ink-900">{editingId === "new" ? "새 직원 추가" : "직원 정보 수정"}</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-ink-500">
            이름
            <input
              value={draft.name}
              onChange={(e) => updateDraft("name", e.target.value)}
              className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-500">
            역할
            <select
              value={draft.role}
              onChange={(e) => updateDraft("role", e.target.value)}
              className="rounded-sm border border-line bg-surface px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
            >
              <option value="guide">가이드</option>
              <option value="admin">관리자</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-500">
            연락처
            <input
              value={draft.phone}
              onChange={(e) => updateDraft("phone", e.target.value)}
              placeholder="010-0000-0000"
              className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-500">
            로그인 PIN (숫자 4자리)
            <input
              value={draft.pin}
              onChange={(e) => updateDraft("pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              inputMode="numeric"
              className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
            />
          </label>
        </div>
        {formError && <p className="mt-2 text-sm text-critical">{formError}</p>}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={saveDraft} className="rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700">
            저장
          </button>
          <button type="button" onClick={cancelEdit} className="rounded-sm border border-line px-3 py-1.5 text-xs text-ink-700 hover:bg-paper">
            취소
          </button>
        </div>
      </div>
    );
  }

  function renderTable(list: Staff[], zone: StaffStatus) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverZone(zone);
        }}
        onDragLeave={() => setDragOverZone((z) => (z === zone ? null : z))}
        onDrop={(e) => handleDrop(e, zone)}
        className={`overflow-x-auto rounded-md border transition-colors ${
          dragOverZone === zone ? "border-rose-600 bg-rose-100" : "border-line"
        }`}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
              <th className="px-4 py-2 font-medium">이름</th>
              <th className="px-4 py-2 font-medium">역할</th>
              <th className="px-4 py-2 font-medium">연락처</th>
              <th className="px-4 py-2 font-medium">로그인 PIN</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-500">
                  {zone === "active" ? "재직 중인 직원이 없습니다." : "이전 직원이 없습니다. 카드를 여기로 끌어다 놓거나 아래 버튼으로 옮길 수 있어요."}
                </td>
              </tr>
            ) : (
              list.map((s) => (
                <tr
                  key={s.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, s.id)}
                  className="cursor-grab border-t border-line active:cursor-grabbing"
                >
                  <td className="px-4 py-2.5 text-ink-900">{s.name}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill tone={s.role === "admin" ? "good" : "neutral"}>
                      {s.role === "admin" ? "관리자" : "가이드"}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-ink-700">{s.phone || "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-ink-700">{s.role === "guide" ? s.pin || "—" : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-3 text-xs">
                      <button type="button" onClick={() => startEdit(s)} className="text-ink-500 hover:text-rose-700">
                        수정
                      </button>
                      {zone === "active" ? (
                        <button
                          type="button"
                          onClick={() => setStatus(s.id, "former")}
                          className="text-ink-500 hover:text-critical"
                        >
                          이전 직원으로
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStatus(s.id, "active")}
                          className="text-ink-500 hover:text-good"
                        >
                          복직 처리
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">계정</h1>
        <p className="text-xs text-ink-500">예시 데이터 · 스태프 전용(고객 계정 없음)</p>
      </div>

      <button
        type="button"
        onClick={startNew}
        className="self-start rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
      >
        + 새 직원 추가
      </button>

      {renderForm()}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink-900">재직 중</p>
        {renderTable(activeStaff, "active")}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink-900">이전 직원</p>
        <p className="text-xs text-ink-500">
          그만둔 직원은 기록을 지우지 않고 여기로 옮겨서 보관합니다. 카드를 끌어다 놓거나(드래그) 오른쪽 버튼으로 옮길 수 있어요.
        </p>
        {renderTable(formerStaff, "former")}
      </div>
    </div>
  );
}
