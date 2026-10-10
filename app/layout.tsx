import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: "MEDCARE · 医患服务平台",
    description: "MEDCARE 医生工作台与患者服务，统一数字医助王主任。",
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
