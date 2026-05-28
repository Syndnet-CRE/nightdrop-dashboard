// Pure math functions for 4 investment strategies
// No React, no DOM, no side effects. All inputs guarded against division by zero.

export function computeHold({ purchase, rehab, noi, noiGrowth, holdYrs, exitCap, ltv, rate, amort }) {
  if (purchase <= 0 || rehab < 0 || noi <= 0 || holdYrs <= 0 || ltv <= 0 || rate < 0 || amort <= 0 || exitCap <= 0) {
    return { gic: NaN, dscr: NaN, coc: NaN, irr: NaN, em: NaN, loan: NaN, equity: NaN, ds: NaN, exitVal: NaN };
  }

  const cost = purchase + rehab;
  const loan = purchase * ltv / 100;
  const equity = cost - loan;
  if (equity <= 0) return { gic: NaN, dscr: NaN, coc: NaN, irr: NaN, em: NaN, loan, equity, ds: NaN, exitVal: NaN };

  const mr = rate / 100 / 12;
  const n = amort * 12;
  const pmt = loan * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
  const ds = pmt * 12;
  const gic = noi / purchase * 100;
  const dscr = noi / ds;

  const noiExit = noi * Math.pow(1 + noiGrowth / 100, holdYrs);
  const exitVal = noiExit / (exitCap / 100);
  const rem = (amort - holdYrs) * 12;
  const bal = pmt * (1 - Math.pow(1 + mr, -rem)) / mr;

  const cfs = [-equity, ...Array.from({ length: holdYrs }, (_, i) => {
    const y = noi * Math.pow(1 + noiGrowth / 100, i);
    return y - ds + (i === holdYrs - 1 ? exitVal - bal : 0);
  })];

  let irr = 0.15;
  for (let i = 0; i < 30; i++) {
    let npv = 0, d = 0;
    cfs.forEach((c, t) => {
      npv += c / Math.pow(1 + irr, t);
      d -= t * c / Math.pow(1 + irr, t + 1);
    });
    if (Math.abs(npv) < 0.01) break;
    irr -= npv / d;
  }

  const coc = (noi - ds) / equity * 100;
  const em = cfs.slice(1).reduce((a, c) => a + c, 0) / Math.abs(cfs[0]);

  return { gic: Number.isFinite(gic) ? gic : NaN, dscr: Number.isFinite(dscr) ? dscr : NaN, coc: Number.isFinite(coc) ? coc : NaN, irr: Number.isFinite(irr) ? irr * 100 : NaN, em: Number.isFinite(em) ? em : NaN, loan, equity, ds, exitVal };
}

export function computeWholesale({ arv, rehab, rule, closing, assign }) {
  if (arv <= 0 || rehab < 0 || rule <= 0 || closing < 0 || assign < 0) {
    return { mao: NaN, maxOffer: NaN, margin: NaN, spread: NaN, roi: NaN };
  }

  const mao = arv * (rule / 100) - rehab;
  const maxOffer = mao - assign;
  const margin = mao / arv * 100;
  const spread = arv - rehab - mao;
  const roi = assign / (maxOffer > 0 ? maxOffer : 1) * 100;

  return {
    mao: Number.isFinite(mao) ? mao : NaN,
    maxOffer: Number.isFinite(maxOffer) ? maxOffer : NaN,
    margin: Number.isFinite(margin) ? margin : NaN,
    spread: Number.isFinite(spread) ? spread : NaN,
    roi: Number.isFinite(roi) ? roi : NaN,
  };
}

export function computeFlip({ arv, purchase, rehab, holdMonths, finRate, sellCosts, buyCosts }) {
  if (arv <= 0 || purchase <= 0 || rehab < 0 || holdMonths <= 0 || finRate < 0 || sellCosts < 0 || buyCosts < 0) {
    return { finCost: NaN, totalIn: NaN, netProfit: NaN, roi: NaN, annRoi: NaN, bePrice: NaN };
  }

  const finCost = purchase * (finRate / 100) * (holdMonths / 12);
  const buyClose = purchase * (buyCosts / 100);
  const sellClose = arv * (sellCosts / 100);
  const totalIn = purchase + rehab + finCost + buyClose;
  const netProfit = arv - totalIn - sellClose;
  const roi = netProfit / totalIn * 100;
  const annRoi = roi / (holdMonths / 12);
  const bePrice = totalIn + sellClose;

  return {
    finCost: Number.isFinite(finCost) ? finCost : NaN,
    totalIn: Number.isFinite(totalIn) ? totalIn : NaN,
    netProfit: Number.isFinite(netProfit) ? netProfit : NaN,
    roi: Number.isFinite(roi) ? roi : NaN,
    annRoi: Number.isFinite(annRoi) ? annRoi : NaN,
    bePrice: Number.isFinite(bePrice) ? bePrice : NaN,
  };
}

export function computeLand({ landCost, entitle, constSF, totalSF, exitSF, sellCosts, devTimeMo }) {
  if (landCost <= 0 || entitle < 0 || constSF <= 0 || totalSF <= 0 || exitSF <= 0 || sellCosts < 0 || devTimeMo <= 0) {
    return { constCost: NaN, totalCost: NaN, gross: NaN, net: NaN, spread: NaN, yield_: NaN, annY: NaN, residual: NaN };
  }

  const constCost = constSF * totalSF;
  const totalCost = landCost + entitle + constCost;
  const gross = exitSF * totalSF;
  const sellClose = gross * (sellCosts / 100);
  const net = gross - sellClose;
  const spread = net - totalCost;
  const yield_ = spread / totalCost * 100;
  const annY = yield_ / (devTimeMo / 12);
  const residual = net - constCost - entitle;

  return {
    constCost: Number.isFinite(constCost) ? constCost : NaN,
    totalCost: Number.isFinite(totalCost) ? totalCost : NaN,
    gross: Number.isFinite(gross) ? gross : NaN,
    net: Number.isFinite(net) ? net : NaN,
    spread: Number.isFinite(spread) ? spread : NaN,
    yield_: Number.isFinite(yield_) ? yield_ : NaN,
    annY: Number.isFinite(annY) ? annY : NaN,
    residual: Number.isFinite(residual) ? residual : NaN,
  };
}
