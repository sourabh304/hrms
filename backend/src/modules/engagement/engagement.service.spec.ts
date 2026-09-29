import { enps } from './engagement.service.js';

describe('enps', () => {
  it('is promoters minus detractors as a percentage', () => {
    // 2 promoters (9,10), 1 passive (8), 1 detractor (3)
    expect(enps([9, 10, 8, 3])).toBe(25);
  });

  it('ranges from -100 to 100', () => {
    expect(enps([0, 1, 2])).toBe(-100);
    expect(enps([9, 10])).toBe(100);
  });

  it('returns null without responses', () => {
    expect(enps([])).toBeNull();
  });
});
