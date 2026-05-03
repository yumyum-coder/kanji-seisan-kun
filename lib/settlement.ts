export type RoleGroup = {
  id: string;
  label: string;
  people: number;
  weight: number;
};

export type PresetKey = "gentle" | "standard" | "strong";

export type SettlementInput = {
  totalAmount: number;
  roundingUnit: number;
  groups: RoleGroup[];
};

export type RoleSettlement = RoleGroup & {
  rawPerPerson: number;
  roundedPerPerson: number;
  finalPerPerson: number;
  subtotal: number;
  adjustment: number;
};

export type SettlementResult = {
  rows: RoleSettlement[];
  totalPeople: number;
  weightedTotal: number;
  roundedTotal: number;
  finalTotal: number;
  roundingAdjustment: number;
  isValid: boolean;
};

export const presetWeights: Record<PresetKey, Record<string, number>> = {
  gentle: {
    director: 1.35,
    manager: 1.2,
    senior: 1.05,
    junior: 0.9
  },
  standard: {
    director: 1.5,
    manager: 1.3,
    senior: 1.1,
    junior: 0.8
  },
  strong: {
    director: 1.8,
    manager: 1.45,
    senior: 1.1,
    junior: 0.65
  }
};

export const defaultGroups: RoleGroup[] = [
  { id: "director", label: "部長", people: 2, weight: presetWeights.standard.director },
  { id: "manager", label: "課長", people: 3, weight: presetWeights.standard.manager },
  { id: "senior", label: "先輩", people: 4, weight: presetWeights.standard.senior },
  { id: "junior", label: "若手", people: 5, weight: presetWeights.standard.junior }
];

const roundToUnit = (amount: number, unit: number) => Math.round(amount / unit) * unit;

export function calculateSettlement(input: SettlementInput): SettlementResult {
  const activeGroups = input.groups.filter((group) => group.people > 0 && group.weight > 0);
  const totalPeople = activeGroups.reduce((sum, group) => sum + group.people, 0);
  const weightedTotal = activeGroups.reduce((sum, group) => sum + group.people * group.weight, 0);
  const unit = Math.max(1, input.roundingUnit);

  if (input.totalAmount <= 0 || totalPeople === 0 || weightedTotal === 0) {
    return {
      rows: input.groups.map((group) => ({
        ...group,
        rawPerPerson: 0,
        roundedPerPerson: 0,
        finalPerPerson: 0,
        subtotal: 0,
        adjustment: 0
      })),
      totalPeople,
      weightedTotal,
      roundedTotal: 0,
      finalTotal: 0,
      roundingAdjustment: 0,
      isValid: false
    };
  }

  const initialRows = input.groups.map<RoleSettlement>((group) => {
    if (group.people <= 0 || group.weight <= 0) {
      return {
        ...group,
        rawPerPerson: 0,
        roundedPerPerson: 0,
        finalPerPerson: 0,
        subtotal: 0,
        adjustment: 0
      };
    }

    const rawPerPerson = (input.totalAmount * group.weight) / weightedTotal;
    const roundedPerPerson = roundToUnit(rawPerPerson, unit);

    return {
      ...group,
      rawPerPerson,
      roundedPerPerson,
      finalPerPerson: roundedPerPerson,
      subtotal: roundedPerPerson * group.people,
      adjustment: 0
    };
  });

  const roundedTotal = initialRows.reduce((sum, row) => sum + row.subtotal, 0);
  let difference = input.totalAmount - roundedTotal;
  const adjustedRows = initialRows.map((row) => ({ ...row }));

  for (const row of adjustedRows) {
    if (difference === 0 || row.people <= 0) {
      continue;
    }

    const adjustment = difference;
    const perPersonAdjustment = adjustment / row.people;
    const nextAmount = row.finalPerPerson + perPersonAdjustment;

    if (nextAmount < 0) {
      continue;
    }

    row.adjustment += adjustment;
    row.subtotal += adjustment;
    row.finalPerPerson = nextAmount;
    difference = 0;
  }

  if (difference !== 0) {
    const fallback = adjustedRows.find((row) => row.people > 0);
    if (fallback) {
      fallback.adjustment += difference;
      fallback.subtotal += difference;
      fallback.finalPerPerson = fallback.subtotal / fallback.people;
      difference = 0;
    }
  }

  const finalTotal = adjustedRows.reduce((sum, row) => sum + row.subtotal, 0);

  return {
    rows: adjustedRows,
    totalPeople,
    weightedTotal,
    roundedTotal,
    finalTotal,
    roundingAdjustment: finalTotal - roundedTotal,
    isValid: finalTotal === input.totalAmount
  };
}

export function formatYen(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Math.round(amount));
}
