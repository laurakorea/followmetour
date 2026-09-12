"use client";

// 상단의 "오늘 내 일정" 예시 카드는 뺐다 — 그 자리에 가이드 소개 내용을
// 직접 넣을 예정(2026-09-13 확인).
import { useEffect, useState } from "react";
import {
  ADDED_GUIDE_PAYSLIPS_STORAGE_KEY,
  ADDED_GUIDE_SETTLEMENTS_STORAGE_KEY,
  GUIDE_CURRENT_NAME_STORAGE_KEY,
  GUIDE_PAYSLIP_COMPLETED_STORAGE_KEY,
  GUIDE_PAYSLIP_EDITS_STORAGE_KEY,
  GUIDE_SETTLEMENT_COMPLETED_STORAGE_KEY,
  GUIDE_SETTLEMENT_EDITS_STORAGE_KEY,
  SAMPLE_GUIDE_PAYSLIPS,
  SAMPLE_GUIDE_SETTLEMENTS,
  type GuidePayslip,
  type GuideSettlementSheet,
} from "@/lib/sample-data";

function AlertBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-critical-wash px-2 py-0.5 text-xs font-medium text-critical">
      미처리 {count}건
    </span>
  );
}

export default function GuideTodayPage() {
  const [pendingSettlements, setPendingSettlements] = useState(0);
  const [pendingPayslips, setPendingPayslips] = useState(0);

  useEffect(() => {
    try {
      const name = localStorage.getItem(GUIDE_CURRENT_NAME_STORAGE_KEY);
      if (!name) return;

      const sheetEdits: Record<string, GuideSettlementSheet> = JSON.parse(
        localStorage.getItem(GUIDE_SETTLEMENT_EDITS_STORAGE_KEY) || "{}",
      );
      const addedSheets: GuideSettlementSheet[] = JSON.parse(
        localStorage.getItem(ADDED_GUIDE_SETTLEMENTS_STORAGE_KEY) || "[]",
      );
      const settlementCompleted: Record<string, boolean> = JSON.parse(
        localStorage.getItem(GUIDE_SETTLEMENT_COMPLETED_STORAGE_KEY) || "{}",
      );
      const mySheets = [...SAMPLE_GUIDE_SETTLEMENTS.map((s) => ({ ...s, ...sheetEdits[s.id] })), ...addedSheets].filter(
        (s) => s.guideName === name,
      );
      setPendingSettlements(mySheets.filter((s) => !settlementCompleted[s.id]).length);

      const payslipEdits: Record<string, GuidePayslip> = JSON.parse(
        localStorage.getItem(GUIDE_PAYSLIP_EDITS_STORAGE_KEY) || "{}",
      );
      const addedPayslips: GuidePayslip[] = JSON.parse(localStorage.getItem(ADDED_GUIDE_PAYSLIPS_STORAGE_KEY) || "[]");
      const payslipCompleted: Record<string, boolean> = JSON.parse(
        localStorage.getItem(GUIDE_PAYSLIP_COMPLETED_STORAGE_KEY) || "{}",
      );
      const myPayslips = [...SAMPLE_GUIDE_PAYSLIPS.map((p) => ({ ...p, ...payslipEdits[p.id] })), ...addedPayslips].filter(
        (p) => p.guideName === name,
      );
      setPendingPayslips(myPayslips.filter((p) => !payslipCompleted[p.id]).length);
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 알림 없이 계속 진행
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <a
        href="/guide/schedule"
        className="rounded-md border border-line bg-surface p-4 text-sm text-ink-700 hover:bg-rose-100 hover:text-rose-700"
      >
        내 일정 달력 보기 →
      </a>
      <a
        href="/guide/receipts"
        className="rounded-md border border-line bg-surface p-4 text-sm text-ink-700 hover:bg-rose-100 hover:text-rose-700"
      >
        영수증 제출 / 내 영수증 보기 →
      </a>
      <a
        href="/guide/payslips"
        className="flex items-center rounded-md border border-line bg-surface p-4 text-sm text-ink-700 hover:bg-rose-100 hover:text-rose-700"
      >
        내 급여명세서 보기 → <AlertBadge count={pendingPayslips} />
      </a>
      <a
        href="/guide/settlements"
        className="flex items-center rounded-md border border-line bg-surface p-4 text-sm text-ink-700 hover:bg-rose-100 hover:text-rose-700"
      >
        내 정산서 보기 → <AlertBadge count={pendingSettlements} />
      </a>
    </div>
  );
}
