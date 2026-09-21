import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: "MedNexusAgent · 医患服务工作台",
    description: "医生健康班、AI 医助、人机协同审核与康复随访。",
    other: {
        "codex-preview": "development",
    },
    icons: {
        icon: "/favicon.svg",
        shortcut: "/favicon.svg",
    },
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>);
}
