"use client";

import { useState } from "react";
import { SAMPLE_REVIEWS, SAMPLE_TOURS } from "@/lib/sample-data";

const VISIBLE_TOURS = SAMPLE_TOURS.filter((t) => t.isCustomerVisible);

export default function CustomerReviewsPage() {
  const approved = SAMPLE_REVIEWS.filter((r) => r.status === "approved");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="font-display text-2xl text-ink-900">후기</h1>

      <div className="flex flex-col gap-3">
        {approved.map((r) => (
          <div key={r.id} className="rounded-md border border-line bg-surface p-4">
            <p className="font-medium text-ink-900">
              {r.tourName} <span className="font-mono text-xs text-ink-500">({r.tourDate})</span>
            </p>
            <p className="text-xs text-ink-500">{r.authorName}</p>
            <p className="mt-2 text-sm text-ink-700">{r.content}</p>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-line bg-surface p-4">
        <p className="mb-1 font-display text-lg text-ink-900">후기 작성하기</p>
        <p className="mb-3 text-xs text-ink-500">
          마이리얼트립이 아닌 대행사를 통해 예약하셨어도 남기실 수 있어요. 투어명과 투어일만 확인합니다.
        </p>
        {submitted ? (
          <p className="rounded-sm bg-good-wash px-3 py-2 text-sm text-good">
            제출됐습니다. 검토 후 게시됩니다.
          </p>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <label className="flex flex-col gap-1 text-sm text-ink-700">
              투어명
              <select required className="rounded-sm border border-line px-3 py-2 text-sm">
                <option value="">선택하세요</option>
                {VISIBLE_TOURS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-700">
              투어일
              <input type="date" required className="rounded-sm border border-line px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-700">
              이름
              <input type="text" required className="rounded-sm border border-line px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-700">
              후기 내용
              <textarea required rows={4} className="rounded-sm border border-line px-3 py-2 text-sm" />
            </label>
            <button type="submit" className="rounded-sm bg-rose-600 py-2.5 text-sm font-medium text-white">
              제출하기
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
