"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ADDED_RECEIPTS_STORAGE_KEY,
  RECEIPT_CHECKED_STORAGE_KEY,
  SAMPLE_RECEIPTS,
  type Receipt,
} from "@/lib/sample-data";

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminReceiptsPage() {
  const [addedReceipts, setAddedReceipts] = useState<Receipt[]>([]);
  const [settledOverrides, setSettledOverrides] = useState<Record<string, boolean>>({});
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedAdded = localStorage.getItem(ADDED_RECEIPTS_STORAGE_KEY);
      if (savedAdded) setAddedReceipts(JSON.parse(savedAdded));
      const savedSettled = localStorage.getItem(RECEIPT_CHECKED_STORAGE_KEY);
      if (savedSettled) setSettledOverrides(JSON.parse(savedSettled));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 표본 데이터만으로 계속 진행
    }
    setHydrated(true);
  }, []);

  const allReceipts = useMemo(
    () =>
      [...SAMPLE_RECEIPTS, ...addedReceipts].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)),
    [addedReceipts],
  );

  function toggleSettled(id: string) {
    if (!hydrated) return;
    const next = { ...settledOverrides, [id]: !settledOverrides[id] };
    setSettledOverrides(next);
    try {
      localStorage.setItem(RECEIPT_CHECKED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 화면 상태는 유지 — 새로고침하면 초기화될 수 있음을 감수
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-ink-900">영수증 관리</h1>
        <p className="text-xs text-ink-500">가이드가 올린 영수증 · 정산완료 누르면 초록색으로 표시</p>
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="whitespace-nowrap bg-paper text-left font-mono text-xs tracking-wide text-ink-500 uppercase">
              <th className="px-3 py-2 font-medium">타임스탬프</th>
              <th className="px-3 py-2 font-medium">성함</th>
              <th className="px-3 py-2 font-medium">급여 수령일</th>
              <th className="px-3 py-2 font-medium">영수증 사용한 날짜</th>
              <th className="px-3 py-2 font-medium">사유</th>
              <th className="px-3 py-2 text-right font-medium">총 금액</th>
              <th className="px-3 py-2 font-medium">영수증 사진</th>
              <th className="px-3 py-2 text-center font-medium">정산완료</th>
            </tr>
          </thead>
          <tbody>
            {allReceipts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-ink-500">
                  아직 올라온 영수증이 없습니다.
                </td>
              </tr>
            ) : (
              allReceipts.map((r) => {
                const isSettled = Boolean(settledOverrides[r.id]);
                return (
                  <tr
                    key={r.id}
                    className={`whitespace-nowrap border-t border-line ${isSettled ? "bg-good-wash" : ""}`}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-ink-700">{formatTimestamp(r.submittedAt)}</td>
                    <td className="px-3 py-2 text-ink-900">{r.guideName}</td>
                    <td className="px-3 py-2 font-mono text-ink-700">{r.payoutDate}</td>
                    <td className="px-3 py-2 font-mono text-ink-700">{r.usedDate}</td>
                    <td className="px-3 py-2 whitespace-normal text-ink-700">{r.reason}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-900">{r.amountKrw.toLocaleString()}원</td>
                    <td className="px-3 py-2">
                      {r.photoDataUrl ? (
                        <button
                          type="button"
                          onClick={() => setZoomPhoto(r.photoDataUrl)}
                          className="block h-12 w-12 overflow-hidden rounded-sm border border-line"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.photoDataUrl} alt="영수증 사진" className="h-full w-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-xs text-ink-500">사진 없음</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSettled}
                        onChange={() => toggleSettled(r.id)}
                        className="h-4 w-4 accent-good"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {zoomPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setZoomPhoto(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomPhoto} alt="영수증 사진 확대" className="max-h-full max-w-full rounded-md" />
        </div>
      )}
    </div>
  );
}
