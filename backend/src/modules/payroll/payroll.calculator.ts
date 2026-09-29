import type { TaxSlab } from '../organization/entities/company-settings.entity.js';

export type ComponentType = 'EARNING' | 'DEDUCTION';
export type Calculation = 'FIXED' | 'PERCENT_OF_CTC' | 'PERCENT_OF_BASIC' | 'BALANCE';

export interface SalaryComponent {
  code: string;
  name: string;
  type: ComponentType;
  calculation: Calculation;
  /** Monthly amount for FIXED, percentage otherwise. Ignored for BALANCE. */
  value: number;
}

export interface PayLine {
  code: string;
  name: string;
  amount: number;
}

export interface MonthlyBreakdown {
  earnings: PayLine[];
  deductions: PayLine[];
  gross: number;
  totalDeductions: number;
  net: number;
}

export const DEFAULT_COMPONENTS: SalaryComponent[] = [
  { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', calculation: 'PERCENT_OF_CTC', value: 50 },
  { code: 'HRA', name: 'Housing Allowance', type: 'EARNING', calculation: 'PERCENT_OF_BASIC', value: 40 },
  { code: 'TRANSPORT', name: 'Transport Allowance', type: 'EARNING', calculation: 'FIXED', value: 150 },
  { code: 'SPECIAL', name: 'Special Allowance', type: 'EARNING', calculation: 'BALANCE', value: 0 },
  { code: 'RETIREMENT', name: 'Retirement Fund', type: 'DEDUCTION', calculation: 'PERCENT_OF_BASIC', value: 12 },
  { code: 'HEALTH', name: 'Health Insurance', type: 'DEDUCTION', calculation: 'FIXED', value: 120 },
];

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Progressive annual tax across slabs. */
export function annualTax(income: number, slabs: TaxSlab[]): number {
  let tax = 0;
  for (const slab of [...slabs].sort((a, b) => a.from - b.from)) {
    if (income <= slab.from) break;
    const upper = slab.to ?? Infinity;
    const taxable = Math.min(income, upper) - slab.from;
    tax += (taxable * slab.ratePercent) / 100;
  }
  return r2(tax);
}

/**
 * Compute a month's pay from an annual CTC and component formulas.
 * `factor` pro-rates earnings (paid days / working days); fixed deductions are not pro-rated.
 */
export function computeMonthly(
  annualCtc: number,
  components: SalaryComponent[],
  taxSlabs: TaxSlab[],
  factor = 1,
): MonthlyBreakdown {
  const monthlyCtc = annualCtc / 12;
  const basicDef = components.find((c) => c.code === 'BASIC');
  const basic = basicDef ? resolve(basicDef, monthlyCtc, 0) : 0;

  const fullEarnings: PayLine[] = [];
  for (const c of components.filter((c) => c.type === 'EARNING' && c.calculation !== 'BALANCE')) {
    fullEarnings.push({ code: c.code, name: c.name, amount: resolve(c, monthlyCtc, basic) });
  }
  const balancing = components.find((c) => c.type === 'EARNING' && c.calculation === 'BALANCE');
  if (balancing) {
    const used = fullEarnings.reduce((s, e) => s + e.amount, 0);
    fullEarnings.push({ code: balancing.code, name: balancing.name, amount: Math.max(0, monthlyCtc - used) });
  }

  const earnings = fullEarnings.map((e) => ({ ...e, amount: r2(e.amount * factor) }));
  const deductions: PayLine[] = components
    .filter((c) => c.type === 'DEDUCTION')
    .map((c) => ({
      code: c.code,
      name: c.name,
      amount: r2(c.calculation === 'FIXED' ? (factor > 0 ? c.value : 0) : resolve(c, monthlyCtc, basic) * factor),
    }));
  deductions.push({ code: 'TAX', name: 'Income Tax (withholding)', amount: r2((annualTax(annualCtc, taxSlabs) / 12) * factor) });

  const gross = r2(earnings.reduce((s, e) => s + e.amount, 0));
  const totalDeductions = r2(deductions.reduce((s, d) => s + d.amount, 0));
  return { earnings, deductions, gross, totalDeductions, net: r2(Math.max(0, gross - totalDeductions)) };
}

function resolve(c: SalaryComponent, monthlyCtc: number, basic: number): number {
  switch (c.calculation) {
    case 'FIXED': return c.value;
    case 'PERCENT_OF_CTC': return (monthlyCtc * c.value) / 100;
    case 'PERCENT_OF_BASIC': return (basic * c.value) / 100;
    case 'BALANCE': return 0;
  }
}
