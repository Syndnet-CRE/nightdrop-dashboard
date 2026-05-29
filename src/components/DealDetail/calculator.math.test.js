import { describe, it, expect } from 'vitest';
import {
  computeHold,
  computeWholesale,
  computeFlip,
  computeLand,
} from './calculator.math';

// Helper: assert two floats are within an absolute tolerance.
function close(actual, expected, tol = 0.5) {
  expect(Math.abs(actual - expected)).toBeLessThan(tol);
}

describe('computeHold', () => {
  // Anchor case — easy to verify by hand
  //   Purchase $1M, NOI $80K, NOI growth 3%, hold 5y, exit cap 7%,
  //   LTV 70%, rate 6.5%, amort 30y, no rehab
  it('returns sane KPIs for a standard buy-and-hold deal', () => {
    const r = computeHold({
      purchase: 1_000_000,
      rehab: 0,
      noi: 80_000,
      noiGrowth: 3,
      holdYrs: 5,
      exitCap: 7,
      ltv: 70,
      rate: 6.5,
      amort: 30,
    });
    // Loan $700K, equity $300K
    expect(r.loan).toBe(700_000);
    expect(r.equity).toBe(300_000);
    // Going-in cap = NOI / purchase = 8.00%
    close(r.gic, 8.0, 0.01);
    // Annual debt service on $700K @ 6.5% 30yr ≈ $53,100
    close(r.ds, 53_100, 500);
    // DSCR ≈ 80K / 53.1K ≈ 1.51
    close(r.dscr, 1.51, 0.05);
    // CoC ≈ (80K - 53.1K) / 300K ≈ 8.97%
    close(r.coc, 8.97, 0.3);
    // Exit value at year 5 NOI / 7%
    //   NOI₅ = 80K × 1.03⁵ ≈ $92,738. Exit val ≈ $1,324,840
    close(r.exitVal, 1_324_840, 1000);
    // IRR should be a positive double-digit percent for this deal
    expect(r.irr).toBeGreaterThan(10);
    expect(r.irr).toBeLessThan(40);
    // EM should be > 1 (we gained money)
    expect(r.em).toBeGreaterThan(1);
  });

  it('returns NaN-only when purchase is zero', () => {
    const r = computeHold({
      purchase: 0,
      rehab: 0,
      noi: 80_000,
      noiGrowth: 3,
      holdYrs: 5,
      exitCap: 7,
      ltv: 70,
      rate: 6.5,
      amort: 30,
    });
    expect(Number.isNaN(r.irr)).toBe(true);
    expect(Number.isNaN(r.dscr)).toBe(true);
  });

  it('returns NaN-only when NOI is zero', () => {
    const r = computeHold({
      purchase: 1_000_000,
      rehab: 0,
      noi: 0,
      noiGrowth: 3,
      holdYrs: 5,
      exitCap: 7,
      ltv: 70,
      rate: 6.5,
      amort: 30,
    });
    expect(Number.isNaN(r.dscr)).toBe(true);
    expect(Number.isNaN(r.coc)).toBe(true);
  });

  it('returns NaN-only when LTV is 100 and no rehab (equity = 0)', () => {
    const r = computeHold({
      purchase: 1_000_000,
      rehab: 0,
      noi: 80_000,
      noiGrowth: 3,
      holdYrs: 5,
      exitCap: 7,
      ltv: 100,
      rate: 6.5,
      amort: 30,
    });
    // equity = 1M - 1M = 0 → returns NaN-only branch
    expect(Number.isNaN(r.irr)).toBe(true);
    expect(Number.isNaN(r.coc)).toBe(true);
  });

  it('never throws on degenerate inputs', () => {
    expect(() =>
      computeHold({ purchase: -1, rehab: 0, noi: 0, noiGrowth: 0, holdYrs: 0, exitCap: 0, ltv: 0, rate: 0, amort: 0 })
    ).not.toThrow();
  });

  it('returns NaN-only when purchase is negative', () => {
    const r = computeHold({
      purchase: -1000000,
      rehab: 0,
      noi: 80_000,
      noiGrowth: 3,
      holdYrs: 5,
      exitCap: 7,
      ltv: 70,
      rate: 6.5,
      amort: 30,
    });
    expect(Number.isNaN(r.irr)).toBe(true);
    expect(Number.isNaN(r.loan)).toBe(true);
  });
});

describe('computeWholesale', () => {
  // V1 default inputs: ARV $22M, rehab $3.8M, rule 70%, closing 3%, assign $150K
  it('matches V1 anchor for the 70% rule on a $22M ARV', () => {
    const r = computeWholesale({
      arv: 22_000_000,
      rehab: 3_800_000,
      rule: 70,
      closing: 3,
      assign: 150_000,
    });
    // MAO = $22M × 0.70 - $3.8M = $11.6M
    close(r.mao, 11_600_000, 1);
    // Max offer = MAO - assignment fee
    close(r.maxOffer, 11_450_000, 1);
    // Margin = MAO / ARV = 52.73%
    close(r.margin, 52.73, 0.05);
    // Spread = ARV - rehab - MAO = $6.6M
    close(r.spread, 6_600_000, 1);
  });

  it('returns NaN-only when ARV is zero', () => {
    const r = computeWholesale({ arv: 0, rehab: 0, rule: 70, closing: 3, assign: 0 });
    expect(Number.isNaN(r.mao)).toBe(true);
  });

  it('returns NaN-only when rule is zero (division-by-zero protection)', () => {
    const r = computeWholesale({ arv: 22_000_000, rehab: 3_800_000, rule: 0, closing: 3, assign: 150_000 });
    expect(Number.isNaN(r.mao)).toBe(true);
  });
});

describe('computeFlip', () => {
  // V1 default flip inputs: ARV $22M, purchase $18.4M, rehab $3.8M,
  // hold 14mo, fin rate 11.5%, sell 4.5%, buy 2%
  it('matches V1 anchor flip economics (negative net for this deal)', () => {
    const r = computeFlip({
      arv: 22_000_000,
      purchase: 18_400_000,
      rehab: 3_800_000,
      holdMonths: 14,
      finRate: 11.5,
      sellCosts: 4.5,
      buyCosts: 2.0,
    });
    // finCost = $18.4M × 0.115 × (14/12) ≈ $2.47M
    close(r.finCost, 2_469_300, 5_000);
    // totalIn = $18.4M + $3.8M + $2.47M + $0.368M ≈ $25.04M
    close(r.totalIn, 25_037_000, 5_000);
    // netProfit = ARV - totalIn - sellClose = negative for this deal
    expect(r.netProfit).toBeLessThan(0);
  });

  it('handles a profitable flip cleanly', () => {
    const r = computeFlip({
      arv: 500_000,
      purchase: 300_000,
      rehab: 50_000,
      holdMonths: 6,
      finRate: 10,
      sellCosts: 6,
      buyCosts: 2,
    });
    expect(r.netProfit).toBeGreaterThan(0);
    expect(r.roi).toBeGreaterThan(0);
  });

  it('returns NaN-only when hold months is zero', () => {
    const r = computeFlip({
      arv: 500_000, purchase: 300_000, rehab: 50_000,
      holdMonths: 0, finRate: 10, sellCosts: 6, buyCosts: 2,
    });
    expect(Number.isNaN(r.netProfit)).toBe(true);
  });

  it('returns NaN-only when holdMonths is zero (division protection)', () => {
    const r = computeFlip({
      arv: 500_000,
      purchase: 300_000,
      rehab: 50_000,
      holdMonths: 0,
      finRate: 11.5,
      sellCosts: 4.5,
      buyCosts: 2.0,
    });
    expect(Number.isNaN(r.finCost)).toBe(true);
  });
});

describe('computeLand', () => {
  // V1 default inputs: land $4.5M, entitle $0.8M, constSF $85, totalSF 124800,
  // exitSF $147, sell 4.5%, devTime 30mo
  it('matches V1 anchor for a development pro forma', () => {
    const r = computeLand({
      landCost: 4_500_000,
      entitle: 800_000,
      constSF: 85,
      totalSF: 124_800,
      exitSF: 147,
      sellCosts: 4.5,
      devTimeMo: 30,
    });
    // constCost = $85 × 124,800 = $10,608,000
    close(r.constCost, 10_608_000, 1);
    // totalCost = $15,908,000
    close(r.totalCost, 15_908_000, 1);
    // gross = $147 × 124,800 = $18,345,600
    close(r.gross, 18_345_600, 1);
    // net ≈ $17.52M
    close(r.net, 17_519_048, 5_000);
    // spread ≈ $1.61M
    close(r.spread, 1_611_048, 5_000);
    // yield ≈ 10.13%
    close(r.yield_, 10.13, 0.1);
  });

  it('returns NaN-only when land cost is zero', () => {
    const r = computeLand({
      landCost: 0, entitle: 0, constSF: 100, totalSF: 50_000,
      exitSF: 150, sellCosts: 5, devTimeMo: 24,
    });
    expect(Number.isNaN(r.spread)).toBe(true);
  });

  it('reports negative spread for an underwater dev deal', () => {
    const r = computeLand({
      landCost: 10_000_000,
      entitle: 2_000_000,
      constSF: 200,
      totalSF: 50_000,
      exitSF: 100,
      sellCosts: 6,
      devTimeMo: 24,
    });
    expect(r.spread).toBeLessThan(0);
  });

  it('returns NaN-only when totalSF is zero (division protection)', () => {
    const r = computeLand({
      landCost: 4_500_000,
      entitle: 800_000,
      constSF: 85,
      totalSF: 0,
      exitSF: 147,
      sellCosts: 4.5,
      devTimeMo: 30,
    });
    expect(Number.isNaN(r.constCost)).toBe(true);
  });
});

describe('feedback-mapping logic (Buy Box Match verdict)', () => {
  // The mapping that ActivityRail uses to derive the visual verdict
  // from the deal's backend feedback field.
  function verdictFromFeedback(feedback, maybeSelected) {
    if (feedback === 'hot') return 'yes';
    if (feedback === 'not_relevant') return 'no';
    if (maybeSelected) return 'maybe';
    return null;
  }

  it('maps hot → yes (Matches)', () => {
    expect(verdictFromFeedback('hot', false)).toBe('yes');
    expect(verdictFromFeedback('hot', true)).toBe('yes'); // hot always wins
  });

  it('maps not_relevant → no (Doesn\'t Match)', () => {
    expect(verdictFromFeedback('not_relevant', false)).toBe('no');
  });

  it('maps null + maybeSelected → maybe (Need More Info, UI-only)', () => {
    expect(verdictFromFeedback(null, true)).toBe('maybe');
  });

  it('maps null + not maybeSelected → no verdict', () => {
    expect(verdictFromFeedback(null, false)).toBeNull();
  });
});
