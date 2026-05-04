"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, Clipboard, Mail, MessageSquareText, Minus, Pencil, Plus, Send, Share2, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import {
  calculateSettlement,
  formatYen,
  type PresetKey,
  type RoleGroup
} from "@/lib/settlement";

type GroupMode = "role" | "year" | "free";
type WorkflowMode = "auto" | "personal";

type FeeRole = {
  id: string;
  label: string;
  fee: number;
};

type PersonalParticipant = {
  id: string;
  name: string;
  roleId: string;
};

type PersonalFormState = {
  roles: FeeRole[];
  participants: PersonalParticipant[];
};

const workflowLabels: Record<WorkflowMode, string> = {
  auto: "自動で傾斜計算",
  personal: "個人別に会費を作成"
};

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
    { id: "director", label: "部長", people: 1 },
    { id: "manager", label: "課長", people: 1 },
    { id: "management", label: "管理職", people: 0 },
    { id: "senior", label: "先輩", people: 0 },
    { id: "junior", label: "若手", people: 0 },
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
    { id: "free1", label: "グループ1", people: 1 },
    { id: "free2", label: "グループ2", people: 1 },
    { id: "free3", label: "グループ3", people: 0 },
    { id: "free4", label: "グループ4", people: 0 }
  ]
};

const defaultFeeRoles: FeeRole[] = [
  { id: "director", label: "部長", fee: 7000 },
  { id: "manager", label: "課長", fee: 5000 },
  { id: "management", label: "管理職", fee: 5000 },
  { id: "senior", label: "先輩", fee: 4000 },
  { id: "junior", label: "若手", fee: 3000 },
  { id: "newcomer", label: "新人", fee: 1000 }
];

const initialPersonalForm: PersonalFormState = {
  roles: defaultFeeRoles,
  participants: [
    { id: "participant-1", name: "山田さん", roleId: "director" },
    { id: "participant-2", name: "佐藤さん", roleId: "manager" },
    { id: "participant-3", name: "田中さん", roleId: "junior" }
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

function normalizeGroupLabels(groups: RoleGroup[]) {
  const legacyLabels: Record<string, string> = {
    "多め": "グループ1",
    "上位者": "グループ1",
    "標準": "グループ2",
    "中堅": "グループ2",
    "少なめ": "グループ3",
    "かなり少なめ": "グループ4"
  };

  return groups.map((group) => ({
    ...group,
    label: legacyLabels[group.label] ?? group.label
  }));
}

type FormState = {
  mode: GroupMode;
  eventName: string;
  totalAmount: number;
  roundingUnit: number;
  note: string;
  groups: RoleGroup[];
  participantNames: Record<string, string>;
};

const initialForm: FormState = {
  mode: "role",
  eventName: "営業部 歓送迎会",
  totalAmount: 50000,
  roundingUnit: 500,
  note: "お手すきの際にご対応いただけますと幸いです。",
  groups: buildGroups("role", "standard"),
  participantNames: {}
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
      className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#264f86] focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 sm:w-auto"
      aria-label={`${label}をコピー`}
    >
      {copied ? <Check size={15} aria-hidden="true" /> : <Clipboard size={15} aria-hidden="true" />}
      {copied ? "コピー済み" : label}
    </button>
  );
}

function MailtoButton({ subject, body }: { subject: string; body: string }) {
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <a
      href={href}
      className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 sm:w-auto"
    >
      <Mail size={15} aria-hidden="true" />
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
      className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 sm:w-auto"
    >
      {shared ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
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

function splitNames(value: string | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function replaceNameAt(value: string | undefined, index: number, name: string) {
  const names = (value ?? "").split(/\r?\n/);
  while (names.length <= index) {
    names.push("");
  }
  names[index] = name;
  return names.join("\n");
}

export default function Home() {
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("auto");
  const [form, setForm] = useState<FormState>(initialForm);
  const [personalForm, setPersonalForm] = useState<PersonalFormState>(initialPersonalForm);
  const [preset, setPreset] = useState<PresetKey>("standard");

  useEffect(() => {
    const storedWorkflow = window.localStorage.getItem("kanji-seisan-workflow");
    if (storedWorkflow === "auto" || storedWorkflow === "personal") {
      setWorkflowMode(storedWorkflow);
    }

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
          groups: parsed.mode && parsed.groups ? normalizeGroupLabels(parsed.groups) : buildGroups(storedMode, preset),
          participantNames: parsed.participantNames ?? {}
        });
      } catch {
        window.localStorage.removeItem("kanji-seisan-form");
      }
    }

    const storedPersonal = window.localStorage.getItem("kanji-seisan-personal-form");
    if (storedPersonal) {
      try {
        const parsed = JSON.parse(storedPersonal) as Partial<PersonalFormState>;
        setPersonalForm({
          roles: parsed.roles?.length ? parsed.roles : initialPersonalForm.roles,
          participants: parsed.participants?.length ? parsed.participants : initialPersonalForm.participants
        });
      } catch {
        window.localStorage.removeItem("kanji-seisan-personal-form");
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("kanji-seisan-form", JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    window.localStorage.setItem("kanji-seisan-workflow", workflowMode);
  }, [workflowMode]);

  useEffect(() => {
    window.localStorage.setItem("kanji-seisan-personal-form", JSON.stringify(personalForm));
  }, [personalForm]);

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

  const groupCostRows = result.rows
    .filter((row) => row.people > 0)
    .map((row) => {
      const adjustment = row.adjustment === 0 ? "" : `（調整 ${formatAdjustment(row.adjustment)}）`;
      return `${row.label}｜${formatYen(row.finalPerPerson)}｜${row.people}名｜${formatYen(row.subtotal)}${adjustment}`;
    });
  const groupSettlementText = [
    `【${form.eventName || "飲み会"} 精算】`,
    `合計金額：${formatYen(form.totalAmount)}`,
    "",
    "区分｜1人あたり｜人数｜小計",
    ...groupCostRows,
    "",
    `回収予定額：${formatYen(result.finalTotal)}`,
    `端数調整：${formatAdjustment(result.roundingAdjustment)}`
  ].join("\n");

  const participantGroupLines = result.rows
    .filter((row) => row.people > 0)
    .map((row) => `${row.label}：${formatYen(row.finalPerPerson)} × ${row.people}名`);
  const hasParticipantNames = result.rows.some((row) => splitNames(form.participantNames[row.id]).length > 0);
  const individualPaymentRows = result.rows.flatMap((row) => {
    const names = (form.participantNames[row.id] ?? "").split(/\r?\n/);

    return Array.from({ length: row.people }).map((_, index) => {
      const name = names[index]?.trim() || `${row.label}${index + 1}人目`;
      return `${name}｜${row.label}｜${formatYen(row.finalPerPerson)}`;
    });
  });
  const individualPaymentLines = individualPaymentRows.map((row) => {
    const [name, , amount] = row.split("｜");
    return `${name}：${amount}`;
  });
  const personSettlementText = [
    `【${form.eventName || "飲み会"} 精算】`,
    `合計金額：${formatYen(form.totalAmount)}`,
    "",
    "氏名｜区分｜金額",
    ...individualPaymentRows,
    "",
    `回収予定額：${formatYen(result.finalTotal)}`
  ].join("\n");
  const settlementText = hasParticipantNames ? personSettlementText : groupSettlementText;
  const participantPaymentText = hasParticipantNames ? personSettlementText : [
    `【${form.eventName || "飲み会"} 精算】`,
    `合計金額：${formatYen(form.totalAmount)}`,
    "",
    ...participantGroupLines,
    "",
    `回収予定額：${formatYen(result.finalTotal)}`
  ].join("\n");

  const approvalMessage = [
    "お疲れさまです。",
    "",
    `${form.eventName || "飲み会"}の精算案を作成いたしました。`,
    "役職・年次に応じて傾斜をつけ、端数は上位の区分で調整しております。",
    "",
    groupSettlementText,
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
    participantPaymentText,
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
    ...(hasParticipantNames
      ? individualPaymentLines
      : participantGroupLines),
    "",
    "恐れ入りますが、該当金額のお振込みをお願いいたします。",
    "振込先は別途ご案内いたします。",
    form.note
  ].filter(Boolean).join("\n");

  const paymentSubject = `【精算のお願い】${form.eventName || "飲み会"}`;

  const personalRows = personalForm.participants.map((participant, index) => {
    const role = personalForm.roles.find((item) => item.id === participant.roleId) ?? personalForm.roles[0];
    return {
      ...participant,
      displayName: participant.name.trim() || `参加者${index + 1}`,
      roleLabel: role?.label ?? "未設定",
      amount: role?.fee ?? 0
    };
  });
  const personalParticipantCount = personalRows.length;
  const personalCollectionTotal = personalRows.reduce((sum, row) => sum + row.amount, 0);
  const personalDifference = personalCollectionTotal - form.totalAmount;
  const roleFeeTableText = [
    "区分｜会費",
    ...personalForm.roles.map((role) => `${role.label || "未設定"}｜${formatYen(role.fee)}`)
  ].join("\n");
  const personalSettlementText = [
    `【${form.eventName || "飲み会"} 精算】`,
    `領収金額：${formatYen(form.totalAmount)}`,
    "",
    "氏名｜区分｜金額",
    ...personalRows.map((row) => `${row.displayName}｜${row.roleLabel}｜${formatYen(row.amount)}`),
    "",
    `参加人数：${personalParticipantCount}名`,
    `回収予定額：${formatYen(personalCollectionTotal)}`,
    `差額（回収 - 領収）：${formatAdjustment(personalDifference)}`,
    ...(personalDifference !== 0
      ? ["差額は補助金・会社負担・幹事調整分としてご確認ください。"]
      : [])
  ].join("\n");
  const personalRequestMessage = [
    "お疲れさまです。",
    "",
    `${form.eventName || "飲み会"}の精算金額が確定しましたので、ご連絡いたします。`,
    "お手数ですが、下記の該当金額をご確認ください。",
    "",
    "【精算表】",
    ...personalRows.map((row) => `${row.displayName}：${formatYen(row.amount)}`),
    "",
    "振込先は別途ご案内いたします。",
    form.note,
    "よろしくお願いいたします。"
  ].filter(Boolean).join("\n");
  const personalLineMessage = [
    `【${form.eventName || "飲み会"} 精算】`,
    "お疲れさまです。精算金額のご案内です。",
    "",
    ...personalRows.map((row) => `${row.displayName}：${formatYen(row.amount)}`),
    "",
    "振込先は別途ご案内いたします。",
    form.note
  ].filter(Boolean).join("\n");
  const personalApprovalMessage = [
    "お疲れさまです。",
    "",
    `${form.eventName || "飲み会"}の個人別精算案を作成いたしました。`,
    "役職ごとの会費設定と、参加者別の精算金額をご確認いただけますでしょうか。",
    "",
    "【役職別会費】",
    roleFeeTableText,
    "",
    "【個人別精算表】",
    personalSettlementText,
    "",
    "金額感や差額の扱いについて、調整が必要な点があればご指示ください。",
    "問題なければ、この内容で参加者へ案内いたします。"
  ].join("\n");

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

  function updatePeople(id: string, nextPeople: number) {
    updateGroup(id, { people: Math.max(0, Math.floor(nextPeople)) });
  }

  function updateParticipantNameAt(groupId: string, index: number, name: string) {
    setForm((current) => ({
      ...current,
      participantNames: {
        ...current.participantNames,
        [groupId]: replaceNameAt(current.participantNames[groupId], index, name)
      }
    }));
  }

  function updateFeeRole(id: string, patch: Partial<FeeRole>) {
    setPersonalForm((current) => ({
      ...current,
      roles: current.roles.map((role) => (role.id === id ? { ...role, ...patch } : role))
    }));
  }

  function updatePersonalParticipant(id: string, patch: Partial<PersonalParticipant>) {
    setPersonalForm((current) => ({
      ...current,
      participants: current.participants.map((participant) =>
        participant.id === id ? { ...participant, ...patch } : participant
      )
    }));
  }

  function addPersonalParticipant() {
    setPersonalForm((current) => ({
      ...current,
      participants: [
        ...current.participants,
        {
          id: `participant-${Date.now()}`,
          name: "",
          roleId: current.roles[0]?.id ?? "director"
        }
      ]
    }));
  }

  function duplicatePersonalParticipant(participant: PersonalParticipant) {
    setPersonalForm((current) => ({
      ...current,
      participants: [
        ...current.participants,
        {
          ...participant,
          id: `participant-${Date.now()}`,
          name: ""
        }
      ]
    }));
  }

  function removePersonalParticipant(id: string) {
    setPersonalForm((current) => ({
      ...current,
      participants: current.participants.filter((participant) => participant.id !== id)
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
      groups: buildGroups(nextMode, preset),
      participantNames: {}
    }));
  }

  function resetInputs() {
    setPreset("standard");
    setForm(initialForm);
    setPersonalForm(initialPersonalForm);
  }

  return (
    <main className="min-h-screen bg-paper">
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="grid size-7 shrink-0 place-items-center rounded border border-line bg-slate-50 text-brand">
                <ShieldCheck size={16} aria-hidden="true" />
              </div>
              <div className="max-w-xl">
                <p className="text-xs font-bold text-accent">幹事精算くん</p>
                <h1 className="mt-0.5 text-lg font-black leading-snug tracking-normal text-ink [text-wrap:balance] sm:text-2xl">
                  飲み会の傾斜精算と精算メール作成を、1分で。
                </h1>
              </div>
            </div>
          </div>
          <div className="max-w-xl">
            <p className="text-sm leading-6 text-slate-600">
              領収金額と参加者区分を入れるだけで、精算表・確認文・参加者向け連絡文を作成できます。
            </p>
            <p className="mt-2 rounded border border-line bg-slate-50 px-2.5 py-1.5 text-xs font-bold leading-5 text-slate-600">
              入力内容はブラウザ内で処理され、サーバーには送信されません。名前を入力した場合も、内容はブラウザ内でのみ処理されます。
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_370px] lg:px-8">
        <section className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-3 shadow-soft">
            <p className="mb-2 text-xs font-black text-slate-500">精算方法</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {(Object.keys(workflowLabels) as WorkflowMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWorkflowMode(mode)}
                  className={`min-h-10 rounded border px-3 text-sm font-black transition ${
                    workflowMode === mode
                      ? "border-brand bg-brand text-white"
                      : "border-line bg-slate-50 text-ink hover:border-brand hover:bg-white"
                  }`}
                >
                  {workflowLabels[mode]}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center gap-2 border-b border-line pb-2">
              <Pencil size={16} className="text-brand" aria-hidden="true" />
              <h2 className="text-base font-black">1. 基本情報</h2>
            </div>
            <div className="grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-600">会の名前</span>
                <input
                  value={form.eventName}
                  onChange={(event) => setForm({ ...form, eventName: event.target.value })}
                  className="min-h-10 rounded border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                  placeholder="例：営業部 歓送迎会"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold text-slate-600">領収書の合計金額</span>
                  <input
                    inputMode="numeric"
                    value={form.totalAmount || ""}
                    onChange={(event) => setForm({ ...form, totalAmount: numberValue(event.target.value) })}
                    className="min-h-10 rounded border border-line bg-white px-3 text-base font-black outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                    placeholder="50000"
                  />
                </label>
                {workflowMode === "auto" && (
                  <label className="grid gap-1.5">
                    <span className="text-xs font-bold text-slate-600">丸め単位</span>
                    <select
                      value={form.roundingUnit}
                      onChange={(event) => setForm({ ...form, roundingUnit: Number(event.target.value) })}
                      className="min-h-10 rounded border border-line bg-white px-3 text-sm font-bold outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                    >
                      {roundingUnits.map((unit) => (
                        <option key={unit} value={unit}>{unit.toLocaleString("ja-JP")}円単位</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-600">任意メモ</span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  className="min-h-16 rounded border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                  placeholder="振込期限や補足を入れられます"
                />
              </label>
            </div>
          </div>

          {workflowMode === "auto" ? (
          <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center gap-2 border-b border-line pb-2">
              <Sparkles size={16} className="text-brand" aria-hidden="true" />
              <h2 className="text-base font-black">2. グループと人数</h2>
            </div>
            <div className="mb-3 grid gap-1.5 sm:grid-cols-3">
              {(Object.keys(modeLabels) as GroupMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => changeMode(mode)}
                  className={`min-h-9 rounded border px-2.5 text-xs font-black transition ${
                    form.mode === mode
                      ? "border-brand bg-slate-100 text-brand"
                      : "border-line bg-slate-50 text-ink hover:border-brand hover:bg-white"
                  }`}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>
            <p className="mb-3 text-sm font-bold leading-6 text-slate-600">
              参加する役職・年次の人数を調整してください。金額の差は選んだ強さに応じて自動計算します。
            </p>
            <p className="mb-2 text-xs font-black text-slate-500">傾斜の強さ</p>
            <div className="mb-3 grid grid-cols-3 gap-1.5">
              {(Object.keys(presetLabels) as PresetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`min-h-9 rounded border px-2.5 text-xs font-black transition ${
                    preset === key
                      ? "border-brand bg-brand text-white"
                      : "border-line bg-slate-50 text-ink hover:border-brand hover:bg-white"
                  }`}
                >
                  {presetLabels[key]}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {form.groups.map((group) => (
                <div key={group.id} className="rounded border border-line bg-slate-50 p-2.5">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_152px] sm:items-center">
                    {form.mode === "free" ? (
                      <label className="grid gap-1">
                        <span className="text-xs font-bold text-slate-500">グループ名</span>
                        <input
                          value={group.label}
                          onChange={(event) => updateGroup(group.id, { label: event.target.value })}
                          className="min-h-9 w-full rounded border border-line bg-white px-2.5 text-sm font-bold outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    ) : (
                      <div>
                        <p className="text-sm font-black text-ink">{group.label}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => updatePeople(group.id, group.people - 1)}
                        className="grid size-9 shrink-0 place-items-center rounded border border-line bg-white text-ink transition hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                        aria-label={`${group.label}を1名減らす`}
                      >
                        <Minus size={15} aria-hidden="true" />
                      </button>
                      <input
                        inputMode="numeric"
                        aria-label={`${group.label}の人数`}
                        value={group.people}
                        onChange={(event) => updatePeople(group.id, numberValue(event.target.value))}
                        className="h-9 w-14 rounded border border-line bg-white px-2 text-center text-sm font-black outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => updatePeople(group.id, group.people + 1)}
                        className="grid size-9 shrink-0 place-items-center rounded border border-line bg-white text-ink transition hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                        aria-label={`${group.label}を1名増やす`}
                      >
                        <Plus size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <details className="mt-3 rounded border border-line bg-white p-3">
              <summary className="cursor-pointer text-sm font-black text-slate-600">参加者名を入力する（任意）</summary>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                名前を入れると参加者向け文面が個別金額の一覧になります。名前を入力した場合も、内容はブラウザ内でのみ処理されます。
              </p>
              <div className="mt-3 grid gap-2">
                {form.groups.filter((group) => group.people > 0).map((group) => {
                  const names = (form.participantNames[group.id] ?? "").split(/\r?\n/);

                  return (
                    <div key={group.id} className="grid gap-2 rounded border border-line bg-slate-50 p-2.5">
                      <p className="text-xs font-black text-slate-600">{group.label}</p>
                      {Array.from({ length: group.people }).map((_, index) => (
                        <input
                          key={`${group.id}-${index}`}
                          value={names[index] ?? ""}
                          onChange={(event) => updateParticipantNameAt(group.id, index, event.target.value)}
                          className="min-h-9 rounded border border-line bg-white px-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                          placeholder={`${group.label} ${index + 1}人目`}
                        />
                      ))}
                    </div>
                  );
                })}
                {result.totalPeople === 0 && (
                  <p className="rounded border border-line bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-500">
                    人数を1名以上にすると、名前入力欄が表示されます。
                  </p>
                )}
              </div>
            </details>
            <details className="mt-3 rounded border border-line bg-white p-3">
              <summary className="cursor-pointer text-sm font-black text-slate-600">詳細設定：傾斜を手動調整する</summary>
              <div className="mt-3 grid gap-2">
                {form.groups.map((group) => (
                  <div key={group.id} className="grid gap-2 rounded border border-line bg-slate-50 p-2.5 sm:grid-cols-[minmax(0,1fr)_96px] sm:items-end">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-ink">{group.label}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">通常は変更不要です</p>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-xs font-bold text-slate-500">重み</span>
                      <input
                        inputMode="decimal"
                        value={group.weight}
                        onChange={(event) => updateGroup(group.id, { weight: Number(event.target.value) || 0 })}
                        className="min-h-9 w-full rounded border border-line bg-white px-2.5 text-center text-sm font-black outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </details>
          </div>
          ) : (
            <PersonalModeInputs
              roles={personalForm.roles}
              participants={personalForm.participants}
              onRoleChange={updateFeeRole}
              onParticipantChange={updatePersonalParticipant}
              onParticipantAdd={addPersonalParticipant}
              onParticipantDuplicate={duplicatePersonalParticipant}
              onParticipantRemove={removePersonalParticipant}
            />
          )}

          <div className="lg:hidden">
            {workflowMode === "auto" ? (
              <ResultCard
                result={result}
                totalAmount={form.totalAmount}
                tableText={settlementText}
                validationMessages={validationMessages}
              />
            ) : (
              <PersonalResultCard
                receiptTotal={form.totalAmount}
                participantCount={personalParticipantCount}
                collectionTotal={personalCollectionTotal}
                difference={personalDifference}
                rows={personalRows}
                tableText={personalSettlementText}
              />
            )}
          </div>

          <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <h2 className="mb-3 border-b border-line pb-2 text-base font-black">4. 生成された文面</h2>
            <GeneratedBlock
              icon={<Mail size={16} />}
              title="上司確認用"
              text={workflowMode === "auto" ? approvalMessage : personalApprovalMessage}
              buttonLabel="確認文をコピー"
            />
            <GeneratedBlock
              icon={<Send size={16} />}
              title="参加者向けメール用"
              text={workflowMode === "auto" ? requestMessage : personalRequestMessage}
              buttonLabel="依頼文をコピー"
            >
              <MailtoButton subject={paymentSubject} body={workflowMode === "auto" ? requestMessage : personalRequestMessage} />
            </GeneratedBlock>
            <GeneratedBlock
              icon={<MessageSquareText size={16} />}
              title="LINE/Teams用短縮文"
              text={workflowMode === "auto" ? lineMessage : personalLineMessage}
              buttonLabel="LINE/Teams用にコピー"
            >
              <ShareButton text={workflowMode === "auto" ? lineMessage : personalLineMessage} />
            </GeneratedBlock>
            <GeneratedBlock icon={<Clipboard size={16} />} title="御礼文" text={thanksMessage} buttonLabel="御礼文をコピー" />
          </div>

          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={resetInputs}
              className="min-h-9 rounded border border-line bg-transparent px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              入力をリセット
            </button>
          </div>

          <SeoSection />
        </section>

        <aside className="hidden lg:sticky lg:top-5 lg:block lg:self-start">
          {workflowMode === "auto" ? (
            <ResultCard
              result={result}
              totalAmount={form.totalAmount}
              tableText={settlementText}
              validationMessages={validationMessages}
            />
          ) : (
            <PersonalResultCard
              receiptTotal={form.totalAmount}
              participantCount={personalParticipantCount}
              collectionTotal={personalCollectionTotal}
              difference={personalDifference}
              rows={personalRows}
              tableText={personalSettlementText}
            />
          )}
        </aside>
      </div>
    </main>
  );
}

function PersonalModeInputs({
  roles,
  participants,
  onRoleChange,
  onParticipantChange,
  onParticipantAdd,
  onParticipantDuplicate,
  onParticipantRemove
}: {
  roles: FeeRole[];
  participants: PersonalParticipant[];
  onRoleChange: (id: string, patch: Partial<FeeRole>) => void;
  onParticipantChange: (id: string, patch: Partial<PersonalParticipant>) => void;
  onParticipantAdd: () => void;
  onParticipantDuplicate: (participant: PersonalParticipant) => void;
  onParticipantRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2 border-b border-line pb-2">
        <Sparkles size={16} className="text-brand" aria-hidden="true" />
        <h2 className="text-base font-black">2. 個人別会費</h2>
      </div>
      <p className="mb-3 text-sm font-bold leading-6 text-slate-600">
        役職ごとの会費を決めて、参加者名と役職を入力します。Excelの精算表を作る感覚で、個人別の案内文まで作れます。
      </p>

      <div className="mb-4">
        <h3 className="mb-2 text-xs font-black text-slate-500">役職別会費</h3>
        <div className="grid gap-2">
          {roles.map((role) => (
            <div key={role.id} className="grid gap-2 rounded border border-line bg-slate-50 p-2.5 sm:grid-cols-[minmax(0,1fr)_128px] sm:items-end">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-500">役職</span>
                <input
                  value={role.label}
                  onChange={(event) => onRoleChange(role.id, { label: event.target.value })}
                  className="min-h-9 rounded border border-line bg-white px-2.5 text-sm font-bold outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-500">会費</span>
                <input
                  inputMode="numeric"
                  value={role.fee || ""}
                  onChange={(event) => onRoleChange(role.id, { fee: numberValue(event.target.value) })}
                  className="min-h-9 rounded border border-line bg-white px-2.5 text-right text-sm font-black outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                  placeholder="7000"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-xs font-black text-slate-500">参加者</h3>
          <button
            type="button"
            onClick={onParticipantAdd}
            className="inline-flex min-h-8 items-center justify-center gap-1 rounded border border-line bg-white px-2.5 text-xs font-black text-ink transition hover:border-brand hover:text-brand"
          >
            <Plus size={14} aria-hidden="true" />
            追加
          </button>
        </div>
        <div className="grid gap-2">
          {participants.map((participant, index) => (
            <div key={participant.id} className="rounded border border-line bg-slate-50 p-2.5">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_132px_auto] sm:items-end">
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-500">氏名</span>
                  <input
                    value={participant.name}
                    onChange={(event) => onParticipantChange(participant.id, { name: event.target.value })}
                    className="min-h-9 rounded border border-line bg-white px-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                    placeholder={`参加者${index + 1}`}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold text-slate-500">役職</span>
                  <select
                    value={participant.roleId}
                    onChange={(event) => onParticipantChange(participant.id, { roleId: event.target.value })}
                    className="min-h-9 rounded border border-line bg-white px-2.5 text-sm font-bold outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.label || "未設定"}</option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-1.5 sm:flex">
                  <button
                    type="button"
                    onClick={() => onParticipantDuplicate(participant)}
                    className="min-h-9 rounded border border-line bg-white px-2 text-xs font-black text-slate-600 transition hover:border-brand hover:text-brand"
                  >
                    複製
                  </button>
                  <button
                    type="button"
                    onClick={() => onParticipantRemove(participant.id)}
                    className="grid min-h-9 place-items-center rounded border border-line bg-white px-2 text-slate-500 transition hover:border-rose-200 hover:text-rose-700"
                    aria-label={`${participant.name || `参加者${index + 1}`}を削除`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {participants.length === 0 && (
            <p className="rounded border border-line bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-500">
              参加者を追加すると、個人別の精算表を作成できます。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonalResultCard({
  receiptTotal,
  participantCount,
  collectionTotal,
  difference,
  rows,
  tableText
}: {
  receiptTotal: number;
  participantCount: number;
  collectionTotal: number;
  difference: number;
  rows: Array<{ id: string; displayName: string; roleLabel: string; amount: number }>;
  tableText: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-2">
        <h2 className="text-base font-black">3. 精算結果</h2>
        <span className={`shrink-0 text-xs font-black ${difference === 0 ? "text-brand" : "text-accent"}`}>
          {difference === 0 ? "差額なし" : "差額あり"}
        </span>
      </div>
      <div className="mb-3 rounded border border-line bg-slate-50 p-3">
        <p className="text-xs font-black text-slate-500">回収予定額</p>
        <p className="mt-1 text-2xl font-black tracking-normal text-ink">{formatYen(collectionTotal)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded border border-line bg-white px-2.5 py-2">
            <p className="text-xs font-bold text-slate-500">参加人数</p>
            <p className="font-black text-ink">{participantCount}名</p>
          </div>
          <div className="rounded border border-line bg-white px-2.5 py-2">
            <p className="text-xs font-bold text-slate-500">差額</p>
            <p className="font-black text-ink">{formatAdjustment(difference)}</p>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded border border-line bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_74px_84px] border-b border-line bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
          <span>氏名</span>
          <span>区分</span>
          <span className="text-right">金額</span>
        </div>
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_74px_84px] items-center border-b border-line px-3 py-2.5 text-sm last:border-b-0">
            <p className="truncate font-black text-ink">{row.displayName}</p>
            <p className="truncate text-xs font-bold text-slate-500">{row.roleLabel}</p>
            <p className="text-right font-black text-ink">{formatYen(row.amount)}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-1.5 text-sm">
        <SummaryLine label="領収金額" value={formatYen(receiptTotal)} />
        <SummaryLine label="回収予定額" value={formatYen(collectionTotal)} />
        <SummaryLine label="差額（回収 - 領収）" value={formatAdjustment(difference)} />
      </div>
      {difference !== 0 && (
        <p className="mt-3 rounded border border-amber-100 bg-amber-50 px-2.5 py-2 text-xs font-bold leading-5 text-amber-800">
          差額は補助金・会社負担・幹事調整分としてご確認ください。
        </p>
      )}
      <div className="mt-3">
        <CopyButton text={tableText} label="結果をコピー" />
      </div>
    </div>
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
    <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-2">
        <h2 className="text-base font-black">3. 精算結果</h2>
        <span className={`shrink-0 text-xs font-black ${result.isValid ? "text-brand" : "text-rose-700"}`}>
          {result.isValid ? "合計一致" : "要確認"}
        </span>
      </div>
      {validationMessages.length > 0 && (
        <div className="mb-3 rounded border border-rose-100 bg-rose-50 p-2.5 text-sm font-bold leading-6 text-rose-700">
          {validationMessages.map((message) => <p key={message}>{message}</p>)}
        </div>
      )}
      <div className="mb-3 rounded border border-line bg-slate-50 p-3">
        <p className="text-xs font-black text-slate-500">回収予定額</p>
        <p className="mt-1 text-2xl font-black tracking-normal text-ink">{formatYen(result.finalTotal)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded border border-line bg-white px-2.5 py-2">
            <p className="text-xs font-bold text-slate-500">人数</p>
            <p className="font-black text-ink">{result.totalPeople}名</p>
          </div>
          <div className="rounded border border-line bg-white px-2.5 py-2">
            <p className="text-xs font-bold text-slate-500">端数調整</p>
            <p className="font-black text-ink">{formatYen(result.roundingAdjustment)}</p>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded border border-line bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_72px_92px] border-b border-line bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
          <span>区分</span>
          <span className="text-right">1人</span>
          <span className="text-right">小計</span>
        </div>
        {result.rows.filter((row) => row.people > 0).map((row) => (
          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_72px_92px] items-center border-b border-line px-3 py-2.5 last:border-b-0">
            <div className="min-w-0">
              <p className="truncate font-black">{row.label}</p>
              <p className="text-xs text-slate-500">{row.people}名</p>
            </div>
            <p className="text-right text-sm font-black">{formatYen(row.finalPerPerson)}</p>
            <div className="text-right">
              <p className="text-sm font-black">{formatYen(row.subtotal)}</p>
              {row.adjustment !== 0 && <p className="text-xs text-accent">調整 {formatYen(row.adjustment)}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-1.5 text-sm">
        <SummaryLine label="領収金額" value={formatYen(totalAmount)} />
        <SummaryLine label="丸め後合計" value={formatYen(result.roundedTotal)} />
      </div>
      <div className="mt-3">
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
    <div className="mb-3 rounded border border-line bg-slate-50 p-3 last:mb-0">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 text-sm font-black text-ink">
          <span className="text-brand">{icon}</span>
          <h3>{title}</h3>
        </div>
        <div className="grid gap-1.5 sm:flex sm:items-center">
          <CopyButton text={text} label={buttonLabel} />
          {children}
        </div>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border border-line bg-white p-3 text-sm leading-6 text-ink">
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

function SeoSection() {
  return (
    <section className="space-y-4 pb-8">
      <InfoCard title="幹事精算くんとは？">
        幹事精算くんは、会社の飲み会や歓送迎会の精算を整理するブラウザ上の簡易ツールです。金額とグループ人数を入力すると、傾斜精算表と連絡文を作成できます。
      </InfoCard>
      <InfoCard title="傾斜精算とは？">
        傾斜精算とは、役職や年次に応じて支払額に差をつける精算方法です。会社の飲み会では、役職が上の方が少し多く負担し、若手の負担を抑える形で使われます。
      </InfoCard>
      <InfoCard title="こんな場面で使えます">
        歓送迎会、忘年会、部署飲み会、プロジェクト打ち上げなど、幹事が先に支払い、あとから参加者へ精算案を共有する場面に向いています。
      </InfoCard>
      <FaqCard />
    </section>
  );
}

function FaqCard() {
  const items = [
    {
      question: "傾斜精算とは何ですか？",
      answer: "役職や年次に応じて支払額に差をつける精算方法です。役職が上の方が少し多く負担する場面で使われます。"
    },
    {
      question: "係数を自分で決める必要はありますか？",
      answer: "基本的には不要です。分け方と人数を入れ、傾斜の強さを選ぶだけで計算できます。"
    },
    {
      question: "入力内容は保存されますか？",
      answer: "入力内容はブラウザ内で処理され、サーバーには送信されません。必要に応じて、この端末内にのみ保存されます。"
    },
    {
      question: "メールやLINEに貼り付けられますか？",
      answer: "はい。上司確認用、参加者向けメール用、LINE/Teams向け短縮文、御礼文をコピーできます。"
    }
  ];

  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <h2 className="mb-3 text-base font-black">よくある質問</h2>
      <dl className="space-y-3">
        {items.map((item) => (
          <div key={item.question}>
            <dt className="text-sm font-black text-ink">{item.question}</dt>
            <dd className="mt-1 text-sm leading-6 text-slate-600">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <h2 className="mb-1.5 text-base font-black">{title}</h2>
      <p className="text-sm leading-6 text-slate-600">{children}</p>
    </article>
  );
}
