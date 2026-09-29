import { evaluateCondition } from './workflow.service.js';

describe('evaluateCondition (approval routing rules)', () => {
  it('routes extended leave to HR only above the threshold', () => {
    const rule = { field: 'days', operator: 'gt' as const, value: 5 };
    expect(evaluateCondition(rule, { days: 8 })).toBe(true);
    expect(evaluateCondition(rule, { days: 5 })).toBe(false);
  });

  it('compares numerically even when metadata holds strings', () => {
    expect(evaluateCondition({ field: 'amount', operator: 'gte', value: 2000 }, { amount: '2000' })).toBe(true);
  });

  it('treats a missing field as not matching', () => {
    expect(evaluateCondition({ field: 'amount', operator: 'gt', value: 0 }, {})).toBe(false);
    expect(evaluateCondition({ field: 'amount', operator: 'gt', value: 0 }, null)).toBe(false);
  });

  it('supports equality on strings', () => {
    expect(evaluateCondition({ field: 'category', operator: 'eq', value: 'TRAVEL' }, { category: 'TRAVEL' })).toBe(true);
    expect(evaluateCondition({ field: 'category', operator: 'neq', value: 'TRAVEL' }, { category: 'MEALS' })).toBe(true);
  });
});
