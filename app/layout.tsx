import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap"
});

const faqItems = [
  {
    question: "傾斜計算を自動でできますか？",
    answer:
      "はい。参加人数と役職・年次を入力すると、選んだ傾斜の強さに応じて精算額を自動計算できます。"
  },
  {
    question: "飲み会の傾斜精算に使えますか？",
    answer:
      "会社の飲み会、歓送迎会、忘年会などで、役職や年次に応じて支払額を分けたい場合に使えます。"
  },
  {
    question: "傾斜割り勘との違いは何ですか？",
    answer:
      "一般的な割り勘は全員で同額に近く分けますが、傾斜精算では役職や年次に応じて負担額に差をつけます。"
  },
  {
    question: "係数を自分で決める必要はありますか？",
    answer:
      "通常は不要です。役職・年次ごとの参加者を入力すると、選んだ傾斜の強さに応じて自動計算できます。必要な場合のみ詳細設定で調整できます。"
  },
  {
    question: "入力内容は送信されますか？",
    answer:
      "入力内容はブラウザ内で処理され、サーバーには送信されません。銀行口座情報の入力欄もありません。"
  },
];

const appDescription =
  "幹事精算くんは、飲み会や歓送迎会の傾斜計算・傾斜精算を自動で行い、個人別の精算表、上司確認文、参加者向け連絡文を作成できる無料ツールです。";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "幹事精算くん",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY"
    },
    url: "https://kanji-seisan-kun.vercel.app/",
    description: appDescription
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  }
];

export const metadata: Metadata = {
  title: "幹事精算くん｜飲み会の傾斜計算・傾斜精算を自動で作成",
  description: appDescription
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={notoSansJp.variable}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
