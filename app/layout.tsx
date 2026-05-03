import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "幹事精算くん | 傾斜精算と依頼文を1分で作成",
  description:
    "会社の飲み会向けに、領収金額から役職・年次ごとの傾斜精算、上司確認文、参加者への振込依頼文まで作れるモバイルファーストな精算ツールです。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={notoSansJp.variable}>{children}</body>
    </html>
  );
}
