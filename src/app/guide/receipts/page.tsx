"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ADDED_RECEIPTS_STORAGE_KEY,
  GUIDE_CURRENT_NAME_STORAGE_KEY,
  GUIDE_NAMES,
  RECEIPT_CHECKED_STORAGE_KEY,
  SAMPLE_RECEIPTS,
  type Receipt,
} from "@/lib/sample-data";

function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GuideReceiptsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [currentGuide, setCurrentGuide] = useState(GUIDE_NAMES[0] ?? "");
  const [addedReceipts, setAddedReceipts] = useState<Receipt[]>([]);
  const [settledOverrides, setSettledOverrides] = useState<Record<string, boolean>>({});

  const [usedDate, setUsedDate] = useState(todayIso());
  const [payoutDate, setPayoutDate] = useState("");
  const [reason, setReason] = useState("");
  const [amountKrw, setAmountKrw] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    try {
      const savedGuide = localStorage.getItem(GUIDE_CURRENT_NAME_STORAGE_KEY);
      if (savedGuide) setCurrentGuide(savedGuide);
      const savedAdded = localStorage.getItem(ADDED_RECEIPTS_STORAGE_KEY);
      if (savedAdded) setAddedReceipts(JSON.parse(savedAdded));
      const savedSettled = localStorage.getItem(RECEIPT_CHECKED_STORAGE_KEY);
      if (savedSettled) setSettledOverrides(JSON.parse(savedSettled));
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 표본 데이터만으로 계속 진행
    }
    setHydrated(true);
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  function submit() {
    setSubmitError("");
    if (!currentGuide) {
      setSubmitError("성함을 선택해주세요.");
      return;
    }
    const amount = Number(amountKrw);
    if (!reason.trim() || !amountKrw || Number.isNaN(amount) || amount <= 0) {
      setSubmitError("사유와 총 금액을 확인해주세요.");
      return;
    }
    if (!photoDataUrl) {
      setSubmitError("영수증 사진을 첨부해야 제출할 수 있습니다.");
      return;
    }
    const receipt: Receipt = {
      id: `rcpt-${Date.now()}`,
      guideName: currentGuide,
      submittedAt: new Date().toISOString(),
      payoutDate,
      usedDate,
      reason: reason.trim(),
      amountKrw: amount,
      photoDataUrl,
    };
    const next = [...addedReceipts, receipt];
    setAddedReceipts(next);
    try {
      localStorage.setItem(ADDED_RECEIPTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      setSubmitError("저장에 실패했습니다 — 사진 용량을 줄여서 다시 시도해주세요.");
      return;
    }
    setReason("");
    setAmountKrw("");
    setPhotoDataUrl("");
    setPayoutDate("");
    setUsedDate(todayIso());
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 2500);
  }

  const myReceipts = useMemo(
    () =>
      [...SAMPLE_RECEIPTS, ...addedReceipts]
        .filter((r) => r.guideName === currentGuide)
        .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)),
    [addedReceipts, currentGuide],
  );

  return (
    <div className="flex flex-col gap-4">
      <a href="/guide" className="text-xs text-ink-500 hover:text-rose-700">
        ← 오늘 일정으로
      </a>
      <h1 className="font-display text-lg text-ink-900">영수증 제출</h1>
      <p className="text-xs text-ink-500">{currentGuide}님으로 로그인됨</p>

      <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-ink-700">
          영수증 사용한 날짜
          <input
            type="date"
            value={usedDate}
            onChange={(e) => setUsedDate(e.target.value)}
            className="rounded-sm border border-line px-2 py-2 text-sm text-ink-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-700">
          급여 수령일 (선택)
          <input
            type="date"
            value={payoutDate}
            onChange={(e) => setPayoutDate(e.target.value)}
            className="rounded-sm border border-line px-2 py-2 text-sm text-ink-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-700">
          사유
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 대성당 입장권"
            className="rounded-sm border border-line px-2 py-2 text-sm text-ink-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-700">
          총 금액(₩)
          <input
            type="number"
            value={amountKrw}
            onChange={(e) => setAmountKrw(e.target.value)}
            placeholder="예: 18000"
            className="rounded-sm border border-line px-2 py-2 text-sm text-ink-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-700">
          영수증 사진 <span className="text-critical">*필수</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            required
            onChange={handlePhotoChange}
            className="text-sm"
          />
        </label>
        {photoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoDataUrl} alt="영수증 미리보기" className="h-32 w-32 rounded-sm border border-line object-cover" />
        )}

        {submitError && <p className="text-sm text-critical">{submitError}</p>}
        {justSubmitted && <p className="text-sm text-good">제출되었습니다.</p>}

        <button
          type="button"
          onClick={submit}
          className="rounded-sm bg-rose-600 py-3 text-sm font-medium text-white"
        >
          제출하기
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink-900">내가 올린 영수증</p>
        {myReceipts.length === 0 ? (
          <p className="text-sm text-ink-500">아직 제출한 영수증이 없습니다.</p>
        ) : (
          myReceipts.map((r) => (
            <div
              key={r.id}
              className={`flex gap-3 rounded-md border p-3 ${
                settledOverrides[r.id] ? "border-good bg-good-wash" : "border-line bg-surface"
              }`}
            >
              {r.photoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photoDataUrl} alt="영수증 사진" className="h-14 w-14 shrink-0 rounded-sm object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-paper text-[10px] text-ink-500">
                  사진 없음
                </div>
              )}
              <div className="flex flex-1 flex-col text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-ink-900">{r.reason}</p>
                  <p
                    className={`text-xs ${
                      settledOverrides[r.id] ? "text-good" : "text-ink-500"
                    }`}
                  >
                    {settledOverrides[r.id] ? "정산완료" : "정산 대기"}
                  </p>
                </div>
                <p className="font-mono text-ink-700">{r.amountKrw.toLocaleString()}원</p>
                <p className="text-xs text-ink-500">
                  사용일 {r.usedDate} · 제출 {formatTimestamp(r.submittedAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
