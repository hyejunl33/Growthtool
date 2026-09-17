import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth tool | Trend-to-Creative",
  description: "패션·뷰티 셀러를 위한 트렌드 기반 광고 소재 제작 MVP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-seed data-seed-color-mode="light-only">
      <body>{children}</body>
    </html>
  );
}
