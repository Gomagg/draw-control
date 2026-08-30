import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draw Control — Lottery Management Platform",
  description: "Enterprise lottery/gaming operations platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}