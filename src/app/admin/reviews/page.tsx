"use client";

import { useState } from "react";
import { StatusPill } from "@/components/status-pill";
import { SAMPLE_REVIEWS, type ReviewStatus } from "@/lib/sample-data";

const STATUS_LABEL: Record<ReviewStatus, { label: string; tone: "good" | "warn" | "critical" }> = {
  pending: { label: "승인 대기", tone: "warn" },
  approved: { label: "게시중", tone: "good" },
  rejected: { label: "거절됨", tone: "critical" },
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState(SAMPLE_REVIEWS);

  const setStatus = (id: string, status: ReviewStatus) =>
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">후기 모더레이션</h1>
        <p className="text-xs text-ink-500">예시 데이터 · 클릭은 되지만 새로고침하면 초기화됩니다</p>
      </div>
      <div className="flex flex-col gap-3">
        {reviews.map((r) => {
          const status = STATUS_LABEL[r.status];
          return (
            <div key={r.id} className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900">
                    {r.tourName} <span className="font-mono text-xs text-ink-500">({r.tourDate})</span>
                  </p>
                  <p className="text-xs text-ink-500">{r.authorName}</p>
                </div>
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
              </div>
              <p className="mt-2 text-sm text-ink-700">{r.content}</p>
              {r.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus(r.id, "approved")}
                    className="rounded-sm bg-good px-3 py-1.5 text-xs font-medium text-white"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(r.id, "rejected")}
                    className="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-700"
                  >
                    거절
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
