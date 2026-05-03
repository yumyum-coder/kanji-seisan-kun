"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, Clipboard, Mail, MessageSquareText, Pencil, Send, Share2, ShieldCheck, Sparkles } from "lucide-react";
import {
  calculateSettlement,
  formatYen,
  type PresetKey,
  type RoleGroup
} from "@/lib/settlement";

type GroupMode = "role" | "year" | "free";

const presetLabels: Record<PresetKey, string> = {
  gentle: "やさしめ",
  standard: "標準",
  strong: "強め"
};

const modeLabels: Record<GroupMode, string> = {
  role: "役職で分ける",
  year: "年次で分ける",
  free: "自由にグループを作る"
};

const roundingUnits = [1, 10, 100, 500, 1000];

const groupWeights: Record<GroupMode, Record<PresetKey, Record<string, number>>> = {
  role: {
    gentle: {
      director: 1.35,
      manager: 1.22,
      management: 1.14,
      senior: 1.05,
      junior: 0.92,
      newcomer: 0.8
    },
    standard: {
      director: 1.6,
      manager: 1.4,
      management: 1.25,
      senior: 1.1,
      junior: 0.85,
      newcomer: 0.65
    },
    strong: {
      director: 1.9,
      manager: 1.6,
      management: 1.35,
      senior: 1.1,
      junior: 0.75,
      newcomer: 0.5
    }
  },
  year: {
    gentle: {
      year10: 1.25,
      year7: 1.15,
      year4: 1.05,
      year2: 0.95,
      year1: 0.85
    },
    standard: {
      year10: 1.45,
      year7: 1.3,
      year4: 1.1,
      year2: 0.9,
      year1: 0.7
    },
    strong: {
      year10: 1.7,
      year7: 1.45,
      year4: 1.1,
      year2: 0.8,
      year1: 0.55
    }
  },
  free: {
    gentle: {
      free1: 1.2,
      free2: 1.05,
      free3: 0.95,
      free4: 0.85
    },
    standard: {
      free1: 1.4,
      free2: 1.15,
      free3: 0.9,
      free4: 0.7
    },
    strong: {
      free1: 1.7,
      free2: 1.25,
      free3: 0.8,
      free4: 0.5
    }
  }
};

const groupTemplates: Record<GroupMode, Array<Omit<RoleGroup, "weight">>> = {
  role: [
    { id: "director", label: "部長", people: 2 },
    { id: "manager", label: "課長", people: 3 },
    { id: "management", label: "管理職", people: 0 },
    { id: "senior", label: "先輩", people: 4 },
    { id: "junior", label: "若手", people: 5 },
    { id: "newcomer", label: "新人", people: 0 }
  ],
  year: [
    { id: "year10", label: "10年目以上", people: 2 },
    { id: "year7", label: "7〜9年目", people: 3 },
    { id: "year4", label: "4〜6年目", people: 4 },
    { id: "year2", label: "2〜3年目", people: 4 },
    { id: "year1", label: "1年目", people: 1 }
  ],
  free: [
    { id: "free1", label: "多め", people: 2 },
    { id: "free2", label: "標準", people: 4 },
    { id: "free3", label: "少なめ", people: 4 },
    { id: "free4", label: "かなり少なめ", people: 0 }
  ]
};

function buildGroups(mode: GroupMode, preset: PresetKey, previousGroups: RoleGroup[] = []) {
  return groupTemplates[mode].map((template) => {
    const previous = previousGroups.find((group) => group.id === template.id);
    return {
      ...template,
      people: previous?.people ?? template.people,
      label: previous?.label ?? template.label,
      weight: previous?.weight ?? groupWeights[mode][preset][template.id] ?? 1
    };
  });
}

type FormState = {
  mode: GroupMode;
  eventName: string;
  totalAmount: number;
  roundingUnit: number;
  note: string;
  groups: RoleGroup[];
};

const initialForm: FormState = {
  mode: "role",
  eventName: "営業部 歓送迎会",
  totalAmount: 50000,
  roundingUnit: 500,
  note: "お手すきの際にご対応いただけますと幸いです。",
  groups: buildGroups("role", "standard")
};

function copyText(text: string, onDone: () => void) {
  navigator.clipboard.writeText(text).then(onDone).catch(() => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    onDone();
  });
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => copyText(text, () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 sm:w-auto"
      aria-label={`${label}をコピー`}
    >
      {copied ? <Check size={18} aria-hidden="true" /> : <Clipboard size={18} aria-hidden="true" />}
      {copied ? "コピー済み" : label}
    </button>
  );
}

function MailtoButton({ subject, body }: { subject: string; body: string }) {
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <a
      href={href}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 sm:w-auto"
    >
      <Mail size={18} aria-hidden="true" />
      メールを作成
    </a>
  );
}

function ShareButton({ text }: { text: string }) {
  const [shared, setShared] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        const done = () => {
          setShared(true);
          window.setTimeout(() => setShared(false), 1600);
        };

        if (navigator.share) {
          navigator.share({ text }).then(done).catch(() => copyText(text, done));
          return;
        }

        copyText(text, done);
      }}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 sm:w-auto"
    >
      {shared ? <Check size={18} aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />}
      {shared ? "共有準備済み" : "LINEで共有"}
    </button>
  );
}

function numberValue(value: string) {
  return Number(value.replaceAll(",", "")) || 0;
}

function formatAdjustment(amount: number) {
  if (amount === 0) {
    return formatYen(0);
  }

  const sign = amount > 0 ? "+" : "-";
  return `${sign}${formatYen(Math.abs(amount))}`;
}

function tiltLabel(weight: number) {
  if (weight >= 1.2) {
    return "傾斜：高め";
  }

  if (weight <= 0.9) {
    return "傾斜：低め";
  }

  return "傾斜：標準";
}

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [preset, setPreset] = useState<PresetKey>("standard");

  useEffect(() => {
    const stored = window.localStorage.getItem("kanji-seisan-form");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<FormState>;
        const storedMode = parsed.mode ?? initialForm.mode;
        setForm({
          ...initialForm,
          mode: storedMode,
          eventName: parsed.eventName ?? initialForm.eventName,
          totalAmount: parsed.totalAmount ?? initialForm.totalAmount,
          roundingUnit: parsed.roundingUnit ?? initialForm.roundingUnit,
          note: parsed.note ?? initialForm.note,
          groups: parsed.mode && parsed.groups ? parsed.groups : buildGroups(storedMode, preset)
        });
      } catch {
        window.localStorage.removeItem("kanji-seisan-form");
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("kanji-seisan-form", JSON.stringify(form));
  }, [form]);

  const result = useMemo(
    () =>
      calculateSettlement({
        totalAmount: form.totalAmount,
        roundingUnit: form.roundingUnit,
        groups: form.groups
      }),
    [form]
  );

  const validationMessages = [
    !form.eventName.trim() && "会の名前を入力してください。",
    form.totalAmount <= 0 && "合計金額を入力してください。",
    result.totalPeople <= 0 && "人数を1名以上にしてください。"
  ].filter((message): message is string => Boolean(message));

  const tableText = [
    `【${form.eventName || "飲み会"} 精算表】`,
    `合計金額：${formatYen(form.totalAmount)}`,
    "",
    ...result.rows
      .filter((row) => row.people > 0)
      .map(
        (row) => {
          const adjustment = row.adjustment === 0 ? "" : `（調整 ${formatAdjustment(row.adjustment)}）`;
          return `${row.label}：${formatYen(row.finalPerPerson)} × ${row.people}名 = ${formatYen(row.subtotal)}${adjustment}`;
        }
      ),
    "",
    `回収予定額：${formatYen(result.finalTotal)}`,
    `端数調整：${formatAdjustment(result.roundingAdjustment)}`
  ].join("\n");

  const approvalMessage = [
    "お疲れさまです。",
    "",
    `${form.eventName || "飲み会"}の精算案を作成いたしました。`,
    "役職・年次に応じて傾斜をつけ、端数は上位の区分で調整しております。",
    "",
    tableText,
    "",
    "上記の金額感で違和感がないか、念のためご確認いただけますでしょうか。",
    "特に傾斜の強さや下位グループの負担額について、調整した方がよい点があればご指示ください。",
    "問題なければ、この内容で参加者へ案内いたします。"
  ].join("\n");

  const requestMessage = [
    "お疲れさまです。",
    "",
    `${form.eventName || "飲み会"}の精算金額が確定しましたので、ご案内いたします。`,
    "恐れ入りますが、振込先をご確認のうえ、下記の該当金額をお振込みいただけますと幸いです。",
    "",
    tableText,
    "",
    "振込先は別途ご案内いたします。",
    "",
    form.note,
    "恐れ入りますが、ご確認のほどよろしくお願いいたします。"
  ].filter(Boolean).join("\n");

  const lineMessage = [
    `【${form.eventName || "飲み会"} 精算】`,
    "お疲れさまです。精算金額のご案内です。",
    "",
    ...result.rows
      .filter((row) => row.people > 0)
      .map((row) => `${row.label}：${formatYen(row.finalPerPerson)}`),
    "",
    "恐れ入りますが、該当金額のお振込みをお願いいたします。",
    "振込先は別途ご案内いたします。",
    form.note
  ].filter(Boolean).join("\n");

  const paymentSubject = `【精算のお願い】${form.eventName || "飲み会"}`;

  const thanksMessage = [
    "皆さま、お疲れさまです。",
    "",
    `${form.eventName || "飲み会"}の精算について、皆さまからの入金を確認いたしました。`,
    "お忙しいところ早々にご対応いただき、ありがとうございました。",
    "",
    "こちらで本件の精算は完了とさせていただきます。",
    "引き続きよろしくお願いいたします。"
  ].join("\n");

  function updateGroup(id: string, patch: Partial<RoleGroup>) {
    setForm((current) => ({
      ...current,
      groups: current.groups.map((group) => (group.id === id ? { ...group, ...patch } : group))
    }));
  }

  function applyPreset(nextPreset: PresetKey) {
    setPreset(nextPreset);
    setForm((current) => ({
      ...current,
      groups: current.groups.map((group) => ({
        ...group,
        weight: groupWeights[current.mode][nextPreset][group.id] ?? group.weight
      }))
    }));
  }

  function changeMode(nextMode: GroupMode) {
    setForm((current) => ({
      ...current,
      mode: nextMode,
      groups: buildGroups(nextMode, preset)
    }));
  }

  function resetInputs() {
    setPreset("standard");
    setForm(initialForm);
  }

  return (
    <main className="min-h-screen bg-paper">
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-brand text-white shadow-sm">
                <ShieldCheck size={23} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-accent">会社飲み会の傾斜精算ワークフロー</p>
                <h1 className="text-2xl font-black tracking-normal text-ink sm:text-4xl">幹事精算くん</h1>
              </div>
            </div>
            <span className="hidden max-w-72 text-right text-xs font-bold leading-5 text-slate-500 sm:inline">
              入力内容はブラウザ内でのみ処理され、サーバーには送信されません
            </span>
          </div>
          <div className="max-w-3xl">
            <p className="text-base leading-8 text-slate-600 sm:text-lg">
              領収金額を入れて、役職・年次ごとの人数を整えるだけ。上司確認用の文面、参加者への振込依頼、締めの御礼まで一気に作れます。
            </p>
            <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600 sm:hidden">
              入力内容はブラウザ内でのみ処理され、サーバーには送信されません。必要に応じて、この端末内にのみ保存されます。
            </p>
            <p className="mt-3 hidden rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600 sm:inline-block">
              このツールはブラウザ上で計算する簡易ツールです。入力内容は外部送信されません。必要に応じて、この端末内にのみ保存されます。
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-8">
        <section className="space-y-5">
          <div className="rounded-xl border border-line bg-white p-4 shadow-soft sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Pencil size={20} className="text-brand" aria-hidden="true" />
              <h2 className="text-lg font-black">1. 基本情報</h2>
            </div>
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-bold">会の名前</span>
                <input
                  value={form.eventName}
                  onChange={(event) => setForm({ ...form, eventName: event.target.value })}
                  className="min-h-12 rounded-lg border border-line bg-slate-50 px-3 text-base outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-blue-100"
                  placeholder="例：営業部 歓送迎会"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold">領収書の合計金額</span>
                  <input
                    inputMode="numeric"
                    value={form.totalAmount || ""}
                    onChange={(event) => setForm({ ...form, totalAmount: numberValue(event.target.value) })}
                    className="min-h-12 rounded-lg border border-line bg-slate-50 px-3 text-xl font-black outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder="50000"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-bold">丸め単位</span>
                  <select
                    value={form.roundingUnit}
                    onChange={(event) => setForm({ ...form, roundingUnit: Number(event.target.value) })}
                    className="min-h-12 rounded-lg border border-line bg-slate-50 px-3 text-base font-bold outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-blue-100"
                  >
                    {roundingUnits.map((unit) => (
                      <option key={unit} value={unit}>{unit.toLocaleString("ja-JP")}円単位</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-bold">任意メモ</span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  className="min-h-20 rounded-lg border border-line bg-slate-50 px-3 py-3 text-base outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-blue-100"
                  placeholder="振込期限や補足を入れられます"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-soft sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-brand" aria-hidden="true" />
              <h2 className="text-lg font-black">2. グループと人数</h2>
            </div>
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {(Object.keys(modeLabels) as GroupMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => changeMode(mode)}
                  className={`min-h-11 rounded-md border px-3 text-sm font-black transition ${
                    form.mode === mode
                      ? "border-brand bg-blue-50 text-brand"
                      : "border-line bg-slate-50 text-ink hover:border-brand hover:bg-white"
                  }`}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>
            <p className="mb-3 text-sm font-bold leading-6 text-slate-600">
              細かい数字を決める必要はありません。分け方と人数を入れるだけで、傾斜の強さに応じて自動計算します。
            </p>
            <p className="mb-2 text-xs font-black text-slate-500">傾斜の強さ</p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {(Object.keys(presetLabels) as PresetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`min-h-11 rounded-md border px-3 text-sm font-black transition ${
                    preset === key
                      ? "border-brand bg-brand text-white shadow-sm"
                      : "border-line bg-slate-50 text-ink hover:border-brand hover:bg-white"
                  }`}
                >
                  {presetLabels[key]}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {form.groups.map((group) => (
                <div key={group.id} className="rounded-xl border border-line bg-slate-50 p-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_112px] sm:items-end">
                    {form.mode === "free" ? (
                      <label className="grid gap-1">
                        <span className="text-xs font-bold text-slate-500">グループ名</span>
                        <input
                          value={group.label}
                          onChange={(event) => updateGroup(group.id, { label: event.target.value })}
                          className="min-h-11 w-full rounded-lg border border-line bg-white px-3 font-bold outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    ) : (
                      <div>
                        <p className="text-base font-black text-ink">{group.label}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{tiltLabel(group.weight)}</p>
                      </div>
                    )}
                    <label className="grid gap-1">
                      <span className="text-xs font-bold text-slate-500">人数</span>
                      <input
                        inputMode="numeric"
                        value={group.people}
                        onChange={(event) => updateGroup(group.id, { people: numberValue(event.target.value) })}
                        className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-center font-black outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <details className="mt-4 rounded-xl border border-line bg-white p-3">
              <summary className="cursor-pointer text-sm font-black text-slate-600">詳細設定：傾斜を手動調整する</summary>
              <div className="mt-3 grid gap-3">
                {form.groups.map((group) => (
                  <div key={group.id} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_112px] sm:items-end">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-ink">{group.label}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{tiltLabel(group.weight)}</p>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-xs font-bold text-slate-500">重み</span>
                      <input
                        inputMode="decimal"
                        value={group.weight}
                        onChange={(event) => updateGroup(group.id, { weight: Number(event.target.value) || 0 })}
                        className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-center font-black outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </details>
          </div>

          <div className="lg:hidden">
            <ResultCard
              result={result}
              totalAmount={form.totalAmount}
              tableText={tableText}
              validationMessages={validationMessages}
            />
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-soft sm:p-6">
            <h2 className="mb-4 text-lg font-black">4. 生成された文面</h2>
            <GeneratedBlock icon={<Mail size={20} />} title="上司確認用" text={approvalMessage} buttonLabel="確認文をコピー" />
            <GeneratedBlock
              icon={<Send size={20} />}
              title="参加者向けメール用"
              text={requestMessage}
              buttonLabel="依頼文をコピー"
            >
              <MailtoButton subject={paymentSubject} body={requestMessage} />
            </GeneratedBlock>
            <GeneratedBlock
              icon={<MessageSquareText size={20} />}
              title="LINE/Teams用短縮文"
              text={lineMessage}
              buttonLabel="LINE/Teams用にコピー"
            >
              <ShareButton text={lineMessage} />
            </GeneratedBlock>
            <GeneratedBlock icon={<Clipboard size={20} />} title="御礼文" text={thanksMessage} buttonLabel="御礼文をコピー" />
          </div>

          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={resetInputs}
              className="min-h-11 rounded-md border border-line bg-transparent px-4 py-2 text-sm font-bold text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              入力をリセット
            </button>
          </div>

          <TrustNote />

          <SeoSection />
        </section>

        <aside className="hidden lg:sticky lg:top-5 lg:block lg:self-start">
          <ResultCard
            result={result}
            totalAmount={form.totalAmount}
            tableText={tableText}
            validationMessages={validationMessages}
          />
        </aside>
      </div>
    </main>
  );
}

function ResultCard({
  result,
  totalAmount,
  tableText,
  validationMessages
}: {
  result: ReturnType<typeof calculateSettlement>;
  totalAmount: number;
  tableText: string;
  validationMessages: string[];
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">3. 精算結果</h2>
        <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${result.isValid ? "bg-blue-50 text-brand" : "bg-rose-50 text-rose-700"}`}>
          {result.isValid ? "合計一致" : "要確認"}
        </span>
      </div>
      {validationMessages.length > 0 && (
        <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-700">
          {validationMessages.map((message) => <p key={message}>{message}</p>)}
        </div>
      )}
      <div className="mb-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
        <p className="text-xs font-black text-slate-500">回収予定額</p>
        <p className="mt-1 text-3xl font-black tracking-normal text-ink">{formatYen(result.finalTotal)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-line bg-white px-3 py-2">
            <p className="text-xs font-bold text-slate-500">人数</p>
            <p className="font-black text-ink">{result.totalPeople}名</p>
          </div>
          <div className="rounded-lg border border-line bg-white px-3 py-2">
            <p className="text-xs font-bold text-slate-500">端数調整</p>
            <p className="font-black text-ink">{formatYen(result.roundingAdjustment)}</p>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_72px_92px] border-b border-line bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
          <span>区分</span>
          <span className="text-right">1人</span>
          <span className="text-right">小計</span>
        </div>
        {result.rows.filter((row) => row.people > 0).map((row) => (
          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_72px_92px] items-center border-b border-line px-3 py-3 last:border-b-0">
            <div className="min-w-0">
              <p className="truncate font-black">{row.label}</p>
              <p className="text-xs text-slate-500">{row.people}名 / {tiltLabel(row.weight)}</p>
            </div>
            <p className="text-right text-sm font-black">{formatYen(row.finalPerPerson)}</p>
            <div className="text-right">
              <p className="text-sm font-black">{formatYen(row.subtotal)}</p>
              {row.adjustment !== 0 && <p className="text-xs text-accent">調整 {formatYen(row.adjustment)}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <SummaryLine label="領収金額" value={formatYen(totalAmount)} />
        <SummaryLine label="丸め後合計" value={formatYen(result.roundedTotal)} />
      </div>
      <div className="mt-4">
        <CopyButton text={tableText} label="結果をコピー" />
      </div>
    </div>
  );
}

function GeneratedBlock({
  icon,
  title,
  text,
  buttonLabel,
  children
}: {
  icon: ReactNode;
  title: string;
  text: string;
  buttonLabel: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 rounded-xl border border-line bg-slate-50 p-4 last:mb-0">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-black text-ink">
          <span className="text-brand">{icon}</span>
          <h3>{title}</h3>
        </div>
        <div className="grid gap-2 sm:flex sm:items-center">
          <CopyButton text={text} label={buttonLabel} />
          {children}
        </div>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-white p-3 text-sm leading-7 text-ink">
        {text}
      </pre>
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? "font-bold text-white" : "font-bold text-slate-500"}>{label}</span>
      <span className={strong ? "text-xl font-black text-white" : "font-black text-ink"}>{value}</span>
    </div>
  );
}

function TrustNote() {
  return (
    <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold leading-7 text-slate-600 shadow-sm">
      このツールはブラウザ上で計算する簡易ツールです。入力内容は外部送信されません。
    </div>
  );
}

function SeoSection() {
  return (
    <section className="space-y-4 pb-8">
      <InfoCard title="傾斜精算とは？">
        傾斜精算とは、役職や年次に応じて支払額に差をつける精算方法です。会社の飲み会では、上位者が少し多めに、若手が少し少なめに負担する形がよく使われます。
      </InfoCard>
      <InfoCard title="幹事の精算メール例文">
        お疲れさまです。先日の飲み会の精算金額が確定しましたのでご案内いたします。恐れ入りますが、振込先をご確認のうえ、下記金額のお振込みをお願いいたします。
      </InfoCard>
      <InfoCard title="よくある質問">
        参加者名や振込先の入力は不要です。まずは役職・年次ごとの人数だけで精算案を作り、必要に応じて Excel や LINE に貼り付けて共有できます。入力内容はブラウザ内でのみ処理され、サーバーには送信されません。
      </InfoCard>
    </section>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl border border-line bg-white p-4 shadow-soft sm:p-6">
      <h2 className="mb-2 text-lg font-black">{title}</h2>
      <p className="leading-8 text-slate-600">{children}</p>
    </article>
  );
}
