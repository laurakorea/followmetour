"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ADDED_STAFF_STORAGE_KEY,
  GUIDE_CURRENT_NAME_STORAGE_KEY,
  SAMPLE_STAFF,
  STAFF_EDITS_STORAGE_KEY,
  STAFF_STATUS_STORAGE_KEY,
  type Staff,
  type StaffStatus,
} from "@/lib/sample-data";

export default function GuideLoginPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [addedStaff, setAddedStaff] = useState<Staff[]>([]);
  const [staffEdits, setStaffEdits] = useState<Record<string, Staff>>({});
  const [staffStatus, setStaffStatus] = useState<Record<string, StaffStatus>>({});
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

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

  // 관리자 계정 화면(admin/users)에서 관리하는 것과 같은 직원 데이터를 읽는다
  // — 새로 추가되거나 PIN이 바뀐 가이드도 바로 로그인할 수 있어야 하고,
  // "이전 직원"으로 옮겨진 가이드는 로그인 목록에서 빠져야 한다(2026-09-13 확인).
  const activeGuides = useMemo(() => {
    const merged = [...SAMPLE_STAFF.map((s) => ({ ...s, ...staffEdits[s.id] })), ...addedStaff].map((s) => ({
      ...s,
      status: staffStatus[s.id] ?? s.status,
    }));
    return merged.filter((s) => s.role === "guide" && s.status === "active");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addedStaff, staffEdits, staffStatus]);

  useEffect(() => {
    if (!name && activeGuides.length > 0) {
      setName(activeGuides[0].name);
    }
  }, [name, activeGuides]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const staff = activeGuides.find((g) => g.name === name);
    if (!staff || pin !== staff.pin) {
      setError("PIN이 올바르지 않습니다.");
      return;
    }
    try {
      localStorage.setItem(GUIDE_CURRENT_NAME_STORAGE_KEY, name);
    } catch {
      // 저장 실패해도 이번 세션은 진행 — 새로고침하면 다시 로그인해야 할 수 있음
    }
    router.push("/guide");
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg text-ink-900">가이드 로그인</h1>
      <p className="text-xs text-ink-500">
        데모용 로그인입니다 — PIN은 관리자가 계정 화면에서 지정한 값이에요. 로그인하면 본인 이름으로 된 정보만 보입니다.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-ink-700">
          성함
          <select
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            disabled={!hydrated || activeGuides.length === 0}
            className="rounded-sm border border-line bg-surface px-2 py-2 text-sm text-ink-900"
          >
            {activeGuides.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-700">
          PIN
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setError("");
            }}
            placeholder="0000"
            className="rounded-sm border border-line px-2 py-2 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
          />
        </label>
        {error && <p className="text-sm text-critical">{error}</p>}
        <button type="submit" className="mt-1 rounded-sm bg-rose-600 py-3 text-sm font-medium text-white hover:bg-rose-700">
          로그인
        </button>
      </form>
    </div>
  );
}
