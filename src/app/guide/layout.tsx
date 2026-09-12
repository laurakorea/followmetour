"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GUIDE_CURRENT_NAME_STORAGE_KEY } from "@/lib/sample-data";

/**
 * Guide surface — 데모용 로그인(guide/login) 적용됨. Mobile-only
 * (DESIGN.md §4): a single lightweight screen, not a shrunk admin view.
 * 로그인 안 한 상태로 /guide/* 에 들어오면 로그인 화면으로 돌려보낸다 —
 * 그래야 다른 가이드 이름으로 마음대로 바꿔볼 수 없고, 로그인한 사람 것만 본다.
 */
export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/guide/login";
  const [checked, setChecked] = useState(false);
  const [loggedInName, setLoggedInName] = useState<string | null>(null);

  useEffect(() => {
    let name: string | null = null;
    try {
      name = localStorage.getItem(GUIDE_CURRENT_NAME_STORAGE_KEY);
    } catch {
      // 프라이빗 모드 등에서 localStorage를 막아둔 경우 — 로그인 화면으로 보낸다
    }
    setLoggedInName(name);
    if (!name && !isLoginPage) {
      router.replace("/guide/login");
    } else {
      setChecked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function handleLogout() {
    try {
      localStorage.removeItem(GUIDE_CURRENT_NAME_STORAGE_KEY);
    } catch {
      // 저장 실패해도 화면상으로는 로그아웃 처리
    }
    setLoggedInName(null);
    router.push("/guide/login");
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <span className="font-display text-lg text-ink-900">가이드</span>
        {loggedInName && !isLoginPage && (
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span>{loggedInName}님</span>
            <button type="button" onClick={handleLogout} className="rounded-sm border border-line px-2 py-1 text-ink-700 hover:bg-paper">
              로그아웃
            </button>
          </div>
        )}
      </header>
      <main className="flex-1 p-4">{!isLoginPage && !checked ? null : children}</main>
    </div>
  );
}
