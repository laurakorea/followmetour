"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import {
  ADDED_TOURS_STORAGE_KEY,
  DELETED_TOUR_IDS_STORAGE_KEY,
  SAMPLE_TOURS,
  TOUR_EDITS_STORAGE_KEY,
  type Tour,
} from "@/lib/sample-data";

type DraftTour = { name: string; region: string; myRealTripUrl: string };

function blankDraft(): DraftTour {
  return { name: "", region: "", myRealTripUrl: "" };
}

export default function AdminToursPage() {
  const [hydrated, setHydrated] = useState(false);
  const [addedTours, setAddedTours] = useState<Tour[]>([]);
  const [tourEdits, setTourEdits] = useState<Record<string, Tour>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<DraftTour>(blankDraft());
  const [formError, setFormError] = useState("");

  useEffect(() => {
    try {
      const savedAdded = localStorage.getItem(ADDED_TOURS_STORAGE_KEY);
      if (savedAdded) setAddedTours(JSON.parse(savedAdded));
      const savedEdits = localStorage.getItem(TOUR_EDITS_STORAGE_KEY);
      if (savedEdits) setTourEdits(JSON.parse(savedEdits));
      const savedDeleted = localStorage.getItem(DELETED_TOUR_IDS_STORAGE_KEY);
      if (savedDeleted) setDeletedIds(JSON.parse(savedDeleted));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 표본 데이터만으로 계속 진행
    }
    setHydrated(true);
  }, []);

  // 오버라이드를 통째로 쓰지 않고 원본 위에 덮어써서 병합한다 — 새 필드가
  // 빠진 예전 오버라이드가 와도 원본 값을 지켜준다.
  const mergedSampleTours = SAMPLE_TOURS.map((t) => ({ ...t, ...tourEdits[t.id] }));
  const visibleTours = [...mergedSampleTours.filter((t) => !deletedIds.includes(t.id)), ...addedTours];
  const deletedSampleTours = mergedSampleTours.filter((t) => deletedIds.includes(t.id));
  const isAdded = (id: string) => addedTours.some((t) => t.id === id);

  function persistAdded(next: Tour[]) {
    setAddedTours(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(ADDED_TOURS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지
    }
  }

  function persistEdits(next: Record<string, Tour>) {
    setTourEdits(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(TOUR_EDITS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지
    }
  }

  function persistDeleted(next: string[]) {
    setDeletedIds(next);
    if (!hydrated) return;
    try {
      localStorage.setItem(DELETED_TOUR_IDS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지
    }
  }

  function updateTour(id: string, patch: Partial<Tour>) {
    if (isAdded(id)) {
      persistAdded(addedTours.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      return;
    }
    const current = visibleTours.find((t) => t.id === id);
    if (!current) return;
    persistEdits({ ...tourEdits, [id]: { ...current, ...patch } });
  }

  function toggleVisible(tour: Tour) {
    updateTour(tour.id, { isCustomerVisible: !tour.isCustomerVisible });
  }

  function deleteTour(id: string) {
    if (isAdded(id)) {
      persistAdded(addedTours.filter((t) => t.id !== id));
    } else {
      persistDeleted([...deletedIds, id]);
    }
  }

  function restoreTour(id: string) {
    persistDeleted(deletedIds.filter((d) => d !== id));
  }

  function startAdd() {
    setFormError("");
    setDraft(blankDraft());
    setShowAddForm(true);
  }

  function cancelAdd() {
    setShowAddForm(false);
    setFormError("");
  }

  function saveNewTour() {
    if (!draft.name.trim()) {
      setFormError("투어명을 입력해주세요.");
      return;
    }
    const tour: Tour = {
      id: `tour-${Date.now()}`,
      name: draft.name.trim(),
      region: draft.region.trim() || "—",
      isCustomerVisible: true,
      myRealTripUrl: draft.myRealTripUrl.trim() || null,
    };
    persistAdded([...addedTours, tour]);
    setShowAddForm(false);
  }

  function renderTourCard(tour: Tour) {
    return (
      <div key={tour.id} className="rounded-md border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-ink-900">{tour.name}</p>
            <p className="text-xs text-ink-500">{tour.region}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => toggleVisible(tour)}>
              <StatusPill tone={tour.isCustomerVisible ? "good" : "neutral"}>
                {tour.isCustomerVisible ? "고객 노출" : "비공개"}
              </StatusPill>
            </button>
            <button type="button" onClick={() => deleteTour(tour.id)} className="text-xs text-ink-500 hover:text-critical">
              삭제
            </button>
          </div>
        </div>
        <label className="mt-3 flex flex-col gap-1">
          <span className="text-xs text-ink-500">마이리얼트립 상품 URL</span>
          <input
            type="url"
            value={tour.myRealTripUrl ?? ""}
            onChange={(e) => updateTour(tour.id, { myRealTripUrl: e.target.value || null })}
            placeholder="https://www.myrealtrip.com/offers/..."
            className="rounded-sm border border-line px-3 py-2 text-sm text-ink-900 focus:border-rose-600 focus:outline-none"
          />
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">투어</h1>
        <p className="text-xs text-ink-500">예시 데이터 · 마이리얼트립 URL 관리</p>
      </div>

      <button
        type="button"
        onClick={startAdd}
        className="self-start rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
      >
        + 새 투어 추가
      </button>

      {showAddForm && (
        <div className="rounded-md border border-rose-600 bg-surface p-4">
          <p className="text-sm font-semibold text-ink-900">새 투어</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-ink-500">
              투어명
              <input
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-500">
              지역
              <input
                value={draft.region}
                onChange={(e) => setDraft((prev) => ({ ...prev, region: e.target.value }))}
                placeholder="예: Barcelona"
                className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-500">
              마이리얼트립 상품 URL
              <input
                value={draft.myRealTripUrl}
                onChange={(e) => setDraft((prev) => ({ ...prev, myRealTripUrl: e.target.value }))}
                placeholder="https://www.myrealtrip.com/offers/..."
                className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink-900 focus:border-line-strong focus:outline-none"
              />
            </label>
          </div>
          {formError && <p className="mt-2 text-sm text-critical">{formError}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={saveNewTour} className="rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700">
              추가하기
            </button>
            <button type="button" onClick={cancelAdd} className="rounded-sm border border-line px-3 py-1.5 text-xs text-ink-700 hover:bg-paper">
              취소
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">{visibleTours.map(renderTourCard)}</div>

      {deletedSampleTours.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink-900">삭제한 투어</p>
          <p className="text-xs text-ink-500">
            이미 지난 일정·예약의 투어명은 그대로 남아있어 문제없습니다. 실수로 지웠다면 복구할 수 있어요.
          </p>
          <div className="flex flex-col gap-2">
            {deletedSampleTours.map((tour) => (
              <div key={tour.id} className="flex items-center justify-between rounded-md border border-line bg-paper p-3">
                <div>
                  <p className="text-sm text-ink-900">{tour.name}</p>
                  <p className="text-xs text-ink-500">{tour.region}</p>
                </div>
                <button
                  type="button"
                  onClick={() => restoreTour(tour.id)}
                  className="rounded-sm border border-line px-2.5 py-1 text-xs text-ink-700 hover:bg-surface"
                >
                  복구
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
