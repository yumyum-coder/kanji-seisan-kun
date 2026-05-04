import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans"
});

const faqItems = [
  {
    question: "傾斜精算とは何ですか？",
    answer:
      "役職や年次に応じて支払額に差をつける精算方法です。会社の飲み会では、役職が上の方が少し多く負担し、若手の負担を抑える形で使われます。"
  },
  {
    question: "係数を自分で決める必要はありますか？",
    answer:
      "基本的には不要です。役職または年次のグループと人数を入力し、傾斜の強さを選ぶだけで計算できます。必要な場合のみ詳細設定で調整できます。"
  },
  {
    question: "入力内容は保存されますか？",
    answer:
      "入力内容はブラウザ内で処理され、サーバーには送信されません。必要に応じて、この端末内にのみ保存されます。"
  },
  {
    question: "メールやLINEに貼り付けられますか？",
    answer:
      "はい。上司確認用、参加者向けメール用、LINE/Teams向け短縮文、御礼文をコピーして利用できます。"
  }
];

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
    description:
      "会社の飲み会・歓送迎会・忘年会などの傾斜精算を計算し、上司確認用メッセージや参加者向け精算メールを作成できる無料のWebツールです。"
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
  title: "幹事精算くん｜飲み会の傾斜精算・精算メール作成ツール",
  description:
    "幹事精算くんは、会社の飲み会・歓送迎会・忘年会などの傾斜精算をかんたんに計算し、上司確認用メッセージや参加者向け精算メールを自動作成できる無料ツールです。"
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
