import type { Metadata } from "next";
import { Gowun_Dodum, IBM_Plex_Sans_KR, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Fonts per DESIGN.md §2. Gowun Dodum is customer-surface headlines only;
// IBM Plex Sans KR is the shared body/UI face across all three surfaces;
// IBM Plex Mono is for tabular figures (money, dates, counts) in admin.
const gowunDodum = Gowun_Dodum({
  variable: "--font-gowun-dodum",
  subsets: ["latin"],
  weight: "400",
});

const plexSansKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "팔로우미투어",
  description: "스페인 전문 여행사 팔로우미투어",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${gowunDodum.variable} ${plexSansKr.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink-700">{children}</body>
    </html>
  );
}
