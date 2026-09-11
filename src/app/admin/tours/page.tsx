"use client";

import { useState } from "react";
import { SAMPLE_TOURS } from "@/lib/sample-data";
import { StatusPill } from "@/components/status-pill";

export default function AdminToursPage() {
  const [urls, setUrls] = useState<Record<string, string>>(
    Object.fromEntries(SAMPLE_TOURS.map((t) => [t.id, t.myRealTripUrl ?? ""])),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">투어</h1>
        <p className="text-xs text-ink-500">예시 데이터 · 마이리얼트립 URL 관리</p>
      </div>
      <div className="flex flex-col gap-3">
        {SAMPLE_TOURS.map((tour) => (
          <div key={tour.id} className="rounded-md border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink-900">{tour.name}</p>
                <p className="text-xs text-ink-500">{tour.region}</p>
              </div>
              <StatusPill tone={tour.isCustomerVisible ? "good" : "neutral"}>
                {tour.isCustomerVisible ? "고객 노출" : "비공개"}
              </StatusPill>
            </div>
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-xs text-ink-500">마이리얼트립 상품 URL</span>
              <input
                type="url"
                value={urls[tour.id]}
                onChange={(e) => setUrls((prev) => ({ ...prev, [tour.id]: e.target.value }))}
                placeholder="https://www.myrealtrip.com/offers/..."
                className="rounded-sm border border-line px-3 py-2 text-sm text-ink-900 focus:border-rose-600 focus:outline-none"
              />
            </label>
            <button
              type="button"
              disabled
              title="백엔드 연결 전 — UI 검토용 목업입니다"
              className="mt-2 rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              저장 (연결 예정)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
