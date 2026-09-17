import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth tool | Trend-to-Creative",
  description: "뷰티 셀러를 위한 실시간 트렌드·AI 광고 소재·성과 통합 MVP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-seed data-seed-color-mode="light-only">
      <body>{children}</body>
    </html>
  );
}
