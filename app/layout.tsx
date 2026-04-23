import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TaskFlow",
  description: "Personal task manager",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="h-full" style={{ background: "var(--bg-app)", color: "var(--text-hi)", overflow: "hidden" }}>{children}</body>
    </html>
  );
}
