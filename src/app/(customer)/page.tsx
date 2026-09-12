"use client";

import { useEffect, useState } from "react";
import {
  DELETED_TOUR_IDS_STORAGE_KEY,
  SAMPLE_TOURS,
  TOUR_EDITS_STORAGE_KEY,
  type Tour,
} from "@/lib/sample-data";

export default function CustomerHomePage() {
  const [tourEdits, setTourEdits] = useState<Record<string, Tour>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const savedEdits = localStorage.getItem(TOUR_EDITS_STORAGE_KEY);
      if (savedEdits) setTourEdits(JSON.parse(savedEdits));
      const savedDeleted = localStorage.getItem(DELETED_TOUR_IDS_STORAGE_KEY);
      if (savedDeleted) setDeletedIds(JSON.parse(savedDeleted));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 표본 데이터만으로 계속 진행
    }
  }, []);

  // 관리자 투어 화면(admin/tours)에서 삭제·수정한 내용을 그대로 반영한다 —
  // 삭제한 투어는 안 보이고, 노출 여부 토글도 여기서 바로 적용된다.
  const visibleTours = SAMPLE_TOURS.filter((t) => !deletedIds.includes(t.id))
    .map((t) => ({ ...t, ...tourEdits[t.id] }))
    .filter((t) => t.isCustomerVisible);

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="font-display text-2xl text-ink-900 text-balance">
        스페인 전문 여행사, 팔로우미투어
      </h1>
      <div className="grid gap-4">
        {visibleTours.map((tour) => (
          <a
            key={tour.id}
            href={tour.myRealTripUrl ?? "#"}
            className="rounded-md border border-line bg-surface p-4 transition-colors hover:border-rose-600"
          >
            <p className="text-xs text-ink-500">{tour.region}</p>
            <p className="font-display text-lg text-ink-900">{tour.name}</p>
            {!tour.myRealTripUrl && (
              <span className="mt-2 inline-block rounded-full bg-warn-wash px-2 py-0.5 text-xs text-warn">
                마이리얼트립 연결 준비중 (예시 데이터)
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
