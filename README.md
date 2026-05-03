# 幹事精算くん

Japanese company drinking-party settlement workflow tool.

領収金額、役職別人数、傾斜係数から精算表を作成し、上司確認メッセージ・参加者向け支払い依頼文・入金確認後の御礼文を生成します。

## Features

- Next.js App Router
- TypeScript
- Tailwind CSS
- No backend
- No login
- No database
- Browser-only calculation
- Optional localStorage persistence on the user's device
- Mobile-first workflow

## Local Setup

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

This project uses Webpack for Next.js dev/build scripts:

```bash
npm run dev
npm run build
```

## Build

```bash
npm run build
```

Expected build script:

```json
"build": "next build --webpack"
```

## Privacy Notes

This app is designed as a browser-only tool. Inputs are processed in the browser and are not sent to a server by the app.

The MVP intentionally does not collect bank account information. If localStorage is available, form inputs may be saved only on the current device for convenience.

## Vercel Deployment

1. Push this project to GitHub.
2. Import the GitHub repository into Vercel.
3. Use the default Next.js framework preset.
4. Build command:

```bash
npm run build
```

5. No environment variables are required.

The app is static-friendly and does not require backend services, authentication, or a database.
