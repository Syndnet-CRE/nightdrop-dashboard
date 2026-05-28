import { useState, useMemo } from 'react';
import { TrendingUp, Home, Building2, TreePine, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { computeHold, computeWholesale, computeFlip, computeLand } from './calculator.math';

const EXIT_STRATEGIES = [
  { id: 'hold', label: 'Buy & Hold', icon: Building2, desc: 'IRR / CoC / DSCR' },
  { id: 'wholesale', label: 'Wholesale', icon: TrendingUp, desc: 'MAO / Assignment' },
  { id: 'flip', label: 'Fix & Flip', icon: Home, desc: 'Net Profit / ROI' },
  { id: 'land', label: 'Land / Dev', icon: TreePine, desc: 'Residual / Spread' }
];

// Default going-in cap rate by asset class. Used to seed Year 1 NOI when the
// backend doesn't carry NOI on the deal payload (current reality). Users see
// real numbers on open and can adjust to refine. Values reflect 2026 market
// midpoints; refine as the matcher gets smarter about asset-specific yields.
const ASSET_CAP_RATES = {
  self_storage:        0.065,
  multifamily:         0.055,
  residential_sfr:     0.06,
  mobile_home_rv:      0.07,
  industrial:          0.07,
  retail:              0.07,
  gas_station_c_store: 0.075,
  office:              0.07,
  land:                0.04,
  special_purpose:     0.075,
};

function capRateForAsset(slug) {
  if (!slug) return 0.06;
  const k = String(slug).toLowerCase().replace(/[\s/]+/g, '_');
  return ASSET_CAP_RATES[k] ?? 0.06;
}

function Inp({ label, value, onChange, prefix, suffix, step = 1, min = 0, note }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--secondary)', border: `1px solid ${focused ? 'var(--ring)' : 'var(--border)'}`, borderRadius: 7, overflow: 'hidden', height: 38, boxShadow: focused ? `0 0 0 2px var(--ring)30` : 'none', transition: 'background-color var(--t-fast) var(--ease-fast), border-color var(--t-fast) var(--ease-fast), color var(--t-fast) var(--ease-fast)' }}>
        {prefix && <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 12, color: 'var(--muted-foreground)', padding: '0 9px', borderRight: '1px solid var(--border)', background: 'var(--card)', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0, fontFeatureSettings: "'tnum','zero'" }}>{prefix}</span>}
        <input
          type="number" value={value} min={min} step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-secondary)', fontSize: 14, fontWeight: 600, color: 'var(--fg)', padding: '0 10px', height: '100%', textAlign: 'right', fontFeatureSettings: "'tnum','zero'" }} />
        {suffix && <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 12, color: 'var(--muted-foreground)', padding: '0 9px', borderLeft: '1px solid var(--border)', background: 'var(--card)', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{suffix}</span>}
      </div>
      {note && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--muted-foreground)' }}>{note}</span>}
    </div>
  );
}

function KPI({ label, value, sub, accent, warn, danger, lg }) {
  const color = danger ? 'var(--destructive)' : warn ? 'var(--warning)' : accent ? 'var(--accent)' : 'var(--fg)';
  const bg = danger ? 'rgba(239,68,68,0.07)' : warn ? 'rgba(244,183,62,0.07)' : accent ? 'var(--accent-tint)' : 'var(--secondary)';
  const bd = danger ? 'rgba(239,68,68,0.22)' : warn ? 'rgba(244,183,62,0.22)' : accent ? 'var(--accent)30' : 'var(--border)';
  return (
    <div style={{ padding: '12px 14px', background: bg, border: `1px solid ${bd}`, borderRadius: 8 }}>
      <div style={{ fontFamily: 'var(--font-ui)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 900, fontSize: 10, textAlign: 'center' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-secondary)', fontSize: lg ? 22 : 16, fontWeight: 800, color, fontFeatureSettings: "'tnum','zero'", letterSpacing: '-0.02em', textAlign: 'center' }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--muted-foreground)', marginTop: 3, textAlign: 'center' }}>{sub}</div>}
    </div>
  );
}

function HoldCalc({ purchase: initialPurchase, asset }) {
  const capRate = capRateForAsset(asset);
  const hasRealValue = initialPurchase && initialPurchase > 0;
  const initialNoi = hasRealValue ? Math.round(initialPurchase * capRate) : 1141760;
  const noiNote = hasRealValue
    ? `Auto-estimated at ${(capRate * 100).toFixed(1)}% cap rate. Adjust to refine.`
    : 'Adjust to refine.';

  const [purchase, setPurchase] = useState(initialPurchase || 18400000);
  const [rehab, setRehab] = useState(0);
  const [noi, setNoi] = useState(initialNoi);
  const [noiGrowth, setNoiGrowth] = useState(4.5);
  const [holdYrs, setHoldYrs] = useState(4);
  const [exitCap, setExitCap] = useState(7.0);
  const [ltv, setLtv] = useState(65);
  const [rate, setRate] = useState(7.25);
  const [amort, setAmort] = useState(25);

  const r = useMemo(() => computeHold({ purchase, rehab, noi, noiGrowth, holdYrs, exitCap, ltv, rate, amort }), [purchase, rehab, noi, noiGrowth, holdYrs, exitCap, ltv, rate, amort]);

  const fmtM = (n) => '$' + (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : (n / 1e3).toFixed(0) + 'K');
  const fmtNum = (n) => Number.isFinite(n) ? n.toFixed(1) : '—';
  const fmtNum2 = (n) => Number.isFinite(n) ? n.toFixed(2) : '—';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 10 }}>
        <Inp label="Purchase Price" value={purchase} onChange={setPurchase} prefix="$" step={100000} min={0} />
        <Inp label="Rehab / CapEx" value={rehab} onChange={setRehab} prefix="$" step={50000} min={0} />
        <Inp label="Year 1 NOI" value={noi} onChange={setNoi} prefix="$" step={10000} min={0} note={noiNote} />
        <Inp label="NOI Growth" value={noiGrowth} onChange={setNoiGrowth} suffix="%" step={0.1} min={0} />
        <Inp label="Hold Period" value={holdYrs} onChange={setHoldYrs} suffix="yrs" step={1} min={1} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <Inp label="Exit Cap Rate" value={exitCap} onChange={setExitCap} suffix="%" step={0.1} min={0} />
        <Inp label="LTV" value={ltv} onChange={setLtv} suffix="%" step={1} min={0} />
        <Inp label="Interest Rate" value={rate} onChange={setRate} suffix="%" step={0.05} min={0} />
        <Inp label="Amortization" value={amort} onChange={setAmort} suffix="yrs" step={1} min={1} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 7 }}>
        <KPI label="Levered IRR" value={fmtNum(r.irr) + '%'} accent lg />
        <KPI label="Equity Multiple" value={fmtNum2(r.em) + '×'} accent />
        <KPI label="Cash-on-Cash" value={fmtNum(r.coc) + '%'} warn={Number.isFinite(r.coc) && r.coc < 5} accent={Number.isFinite(r.coc) && r.coc >= 5} />
        <KPI label="DSCR" value={fmtNum2(r.dscr) + '×'} danger={Number.isFinite(r.dscr) && r.dscr < 1.2} accent={Number.isFinite(r.dscr) && r.dscr >= 1.25} />
        <KPI label="Going-in Cap" value={fmtNum2(r.gic) + '%'} />
        <KPI label="Loan Amount" value={Number.isFinite(r.loan) ? fmtM(r.loan) : '—'} sub={ltv + '% LTV'} />
        <KPI label="Equity Req." value={Number.isFinite(r.equity) ? fmtM(r.equity) : '—'} />
        <KPI label="Exit Value" value={Number.isFinite(r.exitVal) ? fmtM(r.exitVal) : '—'} sub={`Yr ${holdYrs} @ ${exitCap}%`} />
      </div>
    </div>
  );
}

function WholesaleCalc({ value: initialArv }) {
  const [arv, setArv] = useState(initialArv || 22000000);
  const [rehab, setRehab] = useState(0);
  const [rule, setRule] = useState(70);
  const [closing, setClosing] = useState(3.0);
  const [assign, setAssign] = useState(150000);

  const r = useMemo(() => computeWholesale({ arv, rehab, rule, closing, assign }), [arv, rehab, rule, closing, assign]);

  const fmtM = (n) => '$' + (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : (n / 1e3).toFixed(0) + 'K');
  const fmtNum = (n) => Number.isFinite(n) ? n.toFixed(1) : '—';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
        <Inp label="ARV" value={arv} onChange={setArv} prefix="$" step={100000} min={0} />
        <Inp label="Est. Rehab" value={rehab} onChange={setRehab} prefix="$" step={50000} min={0} />
        <Inp label="% Rule" value={rule} onChange={setRule} suffix="%" step={1} min={0} note="65–75% typical" />
        <Inp label="Closing Costs" value={closing} onChange={setClosing} suffix="%" step={0.5} min={0} />
        <Inp label="Assignment Fee" value={assign} onChange={setAssign} prefix="$" step={5000} min={0} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 7 }}>
        <KPI label="MAO" value={Number.isFinite(r.mao) ? fmtM(r.mao) : '—'} accent lg sub="Max Allowable Offer" />
        <KPI label="Max Offer" value={Number.isFinite(r.maxOffer) ? fmtM(r.maxOffer) : '—'} accent sub="MAO – assignment" />
        <KPI label="Assignment Fee" value={fmtM(assign)} />
        <KPI label="Buyer Margin" value={fmtNum(r.margin) + '%'} warn={Number.isFinite(r.margin) && r.margin < 65} accent={Number.isFinite(r.margin) && r.margin >= 65} />
        <KPI label="Fee ROI" value={fmtNum(r.roi) + '%'} />
        <KPI label="Spread" value={Number.isFinite(r.spread) ? fmtM(r.spread) : '—'} accent={Number.isFinite(r.spread) && r.spread > 0} danger={Number.isFinite(r.spread) && r.spread <= 0} />
      </div>
    </div>
  );
}

function FlipCalc({ value: initialArv }) {
  const [arv, setArv] = useState(initialArv || 22000000);
  const [purchase, setPurchase] = useState(initialArv ? (initialArv * 0.8) : 18400000);
  const [rehab, setRehab] = useState(0);
  const [holdMonths, setHold] = useState(14);
  const [finRate, setFinRate] = useState(11.5);
  const [sellCosts, setSell] = useState(4.5);
  const [buyCosts, setBuy] = useState(2.0);

  const r = useMemo(() => computeFlip({ arv, purchase, rehab, holdMonths, finRate, sellCosts, buyCosts }), [arv, purchase, rehab, holdMonths, finRate, sellCosts, buyCosts]);

  const fmtM = (n) => '$' + (Math.abs(n) >= 1e6 ? (n < 0 ? '-' : '') + (Math.abs(n) / 1e6).toFixed(2) + 'M' : (n < 0 ? '-' : '') + (Math.abs(n) / 1e3).toFixed(0) + 'K');
  const fmtNum = (n) => Number.isFinite(n) ? n.toFixed(1) : '—';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
        <Inp label="ARV" value={arv} onChange={setArv} prefix="$" step={100000} min={0} />
        <Inp label="Purchase" value={purchase} onChange={setPurchase} prefix="$" step={100000} min={0} />
        <Inp label="Rehab" value={rehab} onChange={setRehab} prefix="$" step={50000} min={0} />
        <Inp label="Hold" value={holdMonths} onChange={setHold} suffix="mo" step={1} min={1} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        <Inp label="Fin. Rate" value={finRate} onChange={setFinRate} suffix="%" step={0.25} min={0} />
        <Inp label="Buy Costs" value={buyCosts} onChange={setBuy} suffix="%" step={0.5} min={0} />
        <Inp label="Sell Costs" value={sellCosts} onChange={setSell} suffix="%" step={0.5} min={0} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 7 }}>
        <KPI label="Net Profit" value={Number.isFinite(r.netProfit) ? fmtM(r.netProfit) : '—'} accent={Number.isFinite(r.netProfit) && r.netProfit > 0} danger={Number.isFinite(r.netProfit) && r.netProfit <= 0} lg />
        <KPI label="ROI" value={fmtNum(r.roi) + '%'} accent={Number.isFinite(r.roi) && r.roi > 15} warn={Number.isFinite(r.roi) && r.roi > 0 && r.roi <= 15} danger={Number.isFinite(r.roi) && r.roi <= 0} />
        <KPI label="Ann. ROI" value={fmtNum(r.annRoi) + '%'} accent={Number.isFinite(r.annRoi) && r.annRoi > 20} />
        <KPI label="Total All-In" value={Number.isFinite(r.totalIn) ? fmtM(r.totalIn) : '—'} />
        <KPI label="Fin. Cost" value={Number.isFinite(r.finCost) ? fmtM(r.finCost) : '—'} sub={holdMonths + 'mo @ ' + finRate + '%'} />
        <KPI label="Break-Even" value={Number.isFinite(r.bePrice) ? fmtM(r.bePrice) : '—'} sub="Min sale price" />
      </div>
    </div>
  );
}

function LandCalc({ value: initialLandCost, building_sf: initialSF, sf: initialSFCamel }) {
  const [landCost, setLandCost] = useState(initialLandCost || 4500000);
  const [entitle, setEntitle] = useState(0);
  const [constSF, setConstSF] = useState(85);
  const [totalSF, setTotalSF] = useState((initialSFCamel ?? initialSF) || 124800);
  const [exitSF, setExitSF] = useState(147);
  const [sellCosts, setSellCosts] = useState(4.5);
  const [devTimeMo, setDevTime] = useState(30);

  const r = useMemo(() => computeLand({ landCost, entitle, constSF, totalSF, exitSF, sellCosts, devTimeMo }), [landCost, entitle, constSF, totalSF, exitSF, sellCosts, devTimeMo]);

  const fmtM = (n) => '$' + (Math.abs(n) >= 1e6 ? (n < 0 ? '-' : '') + (Math.abs(n) / 1e6).toFixed(2) + 'M' : (n < 0 ? '-' : '') + (Math.abs(n) / 1e3).toFixed(0) + 'K');
  const fmtNum = (n) => Number.isFinite(n) ? n.toFixed(1) : '—';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
        <Inp label="Land Cost" value={landCost} onChange={setLandCost} prefix="$" step={100000} min={0} />
        <Inp label="Entitlement" value={entitle} onChange={setEntitle} prefix="$" step={50000} min={0} />
        <Inp label="Const. $/SF" value={constSF} onChange={setConstSF} prefix="$" step={5} min={0} />
        <Inp label="Total SF" value={totalSF} onChange={setTotalSF} step={1000} min={0} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        <Inp label="Exit $/SF" value={exitSF} onChange={setExitSF} prefix="$" step={1} min={0} />
        <Inp label="Sell Costs" value={sellCosts} onChange={setSellCosts} suffix="%" step={0.5} min={0} />
        <Inp label="Dev Timeline" value={devTimeMo} onChange={setDevTime} suffix="mo" step={3} min={6} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 7 }}>
        <KPI label="Dev Profit" value={Number.isFinite(r.spread) ? fmtM(r.spread) : '—'} accent={Number.isFinite(r.spread) && r.spread > 0} danger={Number.isFinite(r.spread) && r.spread <= 0} lg />
        <KPI label="Dev Yield" value={fmtNum(r.yield_) + '%'} accent={Number.isFinite(r.yield_) && r.yield_ > 20} />
        <KPI label="Ann. Dev Yield" value={fmtNum(r.annY) + '%'} accent={Number.isFinite(r.annY) && r.annY > 25} />
        <KPI label="Land Residual" value={Number.isFinite(r.residual) ? fmtM(r.residual) : '—'} sub="What land is worth" />
        <KPI label="Total Cost" value={Number.isFinite(r.totalCost) ? fmtM(r.totalCost) : '—'} />
        <KPI label="Gross Proceeds" value={Number.isFinite(r.gross) ? fmtM(r.gross) : '—'} sub={exitSF + '/SF exit'} />
      </div>
    </div>
  );
}

export function DealCalculator({ deal }) {
  const [strategy, setStrategy] = useState('hold');
  const [open, setOpen] = useState(true);
  const cur = EXIT_STRATEGIES.find(s => s.id === strategy);

  return (
    <section style={{ margin: '0 24px', marginTop: 14 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: open ? '1px solid var(--border)' : 'none' }}>
          <BarChart2 size={14} color="var(--muted-foreground)" strokeWidth={2} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>Investment Analysis</span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 10 }}>
            {EXIT_STRATEGIES.map(s => {
              const Icon = s.icon;
              const active = strategy === s.id;
              return (
                <button key={s.id} onClick={() => { setStrategy(s.id); setOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: active ? 700 : 400, padding: '5px 12px', borderRadius: 6, border: `1px solid ${active ? 'var(--accent)' : 'var(--btn-border)'}`, background: active ? 'var(--accent-tint)' : 'var(--btn-rest)', color: active ? 'var(--accent)' : 'var(--muted-foreground)', cursor: 'pointer', transition: 'background-color var(--t-fast) var(--ease-fast), border-color var(--t-fast) var(--ease-fast), color var(--t-fast) var(--ease-fast)', whiteSpace: 'nowrap' }}
                onMouseOver={(e) => { if (!active) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--fg)'; } }}
                onMouseOut={(e) => { if (!active) { e.currentTarget.style.borderColor = 'var(--btn-border)'; e.currentTarget.style.color = 'var(--muted-foreground)'; } }}>
                  <Icon size={12} strokeWidth={active ? 2.5 : 2} /> {s.label}
                </button>
              );
            })}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--muted-foreground)' }}>{cur?.desc}</span>
            <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}>
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
        {open &&
        <div style={{ padding: '18px 18px 20px' }}>
            {strategy === 'hold' && <HoldCalc purchase={deal.value} asset={deal.asset || deal.asset_class} />}
            {strategy === 'wholesale' && <WholesaleCalc value={deal.value} />}
            {strategy === 'flip' && <FlipCalc value={deal.value} />}
            {strategy === 'land' && <LandCalc value={deal.value} building_sf={deal.building_sf} sf={deal.sf} />}
          </div>
        }
      </div>
    </section>
  );
}
