import { annualTax, computeMonthly, DEFAULT_COMPONENTS } from './payroll.calculator.js';

const SLABS = [
  { from: 0, to: 12000, ratePercent: 0 },
  { from: 12000, to: 50000, ratePercent: 10 },
  { from: 50000, to: null, ratePercent: 20 },
];

describe('annualTax', () => {
  it('is zero inside the first slab', () => {
    expect(annualTax(10000, SLABS)).toBe(0);
  });

  it('applies each slab progressively', () => {
    // 38,000 @10% + 10,000 @20%
    expect(annualTax(60000, SLABS)).toBe(3800 + 2000);
  });
});

describe('computeMonthly', () => {
  it('earnings add up to monthly CTC via the balancing component', () => {
    const m = computeMonthly(120000, DEFAULT_COMPONENTS, SLABS);
    expect(m.gross).toBe(10000);
    expect(m.earnings.find((e) => e.code === 'BASIC')?.amount).toBe(5000);
    expect(m.earnings.find((e) => e.code === 'HRA')?.amount).toBe(2000);
  });

  it('pro-rates earnings but keeps net non-negative', () => {
    const full = computeMonthly(120000, DEFAULT_COMPONENTS, SLABS);
    const half = computeMonthly(120000, DEFAULT_COMPONENTS, SLABS, 0.5);
    expect(half.gross).toBeCloseTo(full.gross / 2, 2);
    expect(half.net).toBeGreaterThanOrEqual(0);
    expect(computeMonthly(120000, DEFAULT_COMPONENTS, SLABS, 0).net).toBe(0);
  });

  it('net equals gross minus deductions', () => {
    const m = computeMonthly(90000, DEFAULT_COMPONENTS, SLABS);
    expect(m.net).toBeCloseTo(m.gross - m.totalDeductions, 2);
  });
});
