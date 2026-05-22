import { useState, useEffect, useRef, Fragment } from 'react';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { BuyBoxPage1 } from './BuyBoxPage1';
import { BuyBoxPage2, BuyBoxPage3 } from './BuyBoxPage23';
import { BuyBoxPage4 } from './BuyBoxPage4';
import { BuyBoxPage5 } from './BuyBoxPage5';
import { BuyBoxPage6 } from './BuyBoxPage6';
import { BuyBoxPage7 } from './BuyBoxPage7';
import { BuyBoxRightRail } from './BuyBoxRightRail';
import SlotMachineCounter from './SlotMachineCounter';
import { Ic } from './buybox-icons';
import BuyBoxActivatedDialog from './BuyBoxActivatedDialog';
import { EMPTY_FORM, nativeToPayload, toNativeForm } from '../lib/wizardFormState';
import { getAssetClass, LAND_SUB_ASSETS } from '../lib/buyBoxTaxonomy';
import '../styles/buy-box-wizard.css';
import '../styles/buy-box-wizard-pages.css';

const STEPS = [
  { id: 1, label: 'Target' },
  { id: 2, label: 'Profile' },
  { id: 3, label: 'Owner' },
  { id: 4, label: 'Distress' },
  { id: 5, label: 'Location' },
  { id: 6, label: 'Threshold' },
  { id: 7, label: 'Activate' },
];

const NATIVE_FORM = EMPTY_FORM;

function assetClassTitle(slug) {
  const cls = getAssetClass(slug);
  return cls?.label || slug;
}

function buildFilters(form) {
  const out = [];
  if (form.assets.length) out.push({ id: 'assets', label: 'Assets', val: form.assets.length === 1 ? assetClassTitle(form.assets[0]) : `${form.assets.length} classes` });
  if (form.subtypes?.length) out.push({ id: 'subtypes', label: 'Subtypes', val: `${form.subtypes.length} selected` });
  if (form.sub_assets?.length) {
    const labels = form.sub_assets.map(s => LAND_SUB_ASSETS.find(x => x.slug === s)?.label || s);
    out.push({ id: 'sub_assets', label: 'Land type', val: labels.join(', ') });
  }
  if (form.geo.states.length) out.push({ id: 'states', label: 'States', val: form.geo.states.join(', ') });
  if (form.geo.metros?.length) out.push({ id: 'metros', label: 'Metros', val: form.geo.metros.length === 1 ? form.geo.metros[0] : `${form.geo.metros.length} metros` });
  if (form.geo.counties.length) out.push({ id: 'counties', label: 'Counties', val: `${form.geo.counties.length}` });
  if (form.geo.zips.length) out.push({ id: 'zips', label: 'Zips', val: form.geo.zips.length === 1 ? form.geo.zips[0] : `${form.geo.zips.length}` });
  if (form.fin.equity_preset) {
    const inactive = !form.fin.price_min;
    out.push({
      id: 'equity',
      label: 'Equity',
      val: inactive ? `≥ ${form.fin.equity_preset} (needs value floor)` : `≥ ${form.fin.equity_preset}`,
      inactive,
    });
  }
  if (form.owner.absentee) out.push({ id: 'absentee', label: '', val: 'Absentee' });
  if (form.owner.hold_min) out.push({ id: 'hold', label: 'Hold', val: `≥${form.owner.hold_min}yr` });
  if (form.owner.out_of_state) out.push({ id: 'oos', label: '', val: 'Out-of-state' });
  if (form.owner.entity && form.owner.entity !== 'any') out.push({ id: 'entity', label: 'Entity', val: form.owner.entity });
  // tax-delinquent and active-foreclosure live in form.signals[] — surface as their own chips
  if (form.signals?.includes('tax-delinquent')) out.push({ id: 'tax_delinquent', label: '', val: 'Tax delinquent' });
  if (form.signals?.includes('active-foreclosure')) out.push({ id: 'active_foreclosure', label: '', val: 'Active foreclosure' });
  if (form.signals.length) out.push({ id: 'signals', label: form.logic, val: `${form.signals.length} signals` });
  const utilCount = ['water', 'sewer', 'electricity', 'gas'].filter(u => form.utils?.[u]).length;
  if (utilCount) out.push({ id: 'utils', label: 'Utilities', val: `${utilCount}/4` });
  if (form.location.flood_exclude) out.push({ id: 'flood', label: '', val: 'No floodplain' });
  if (form.location.opportunity_zone === true) out.push({ id: 'opp_zone', label: '', val: 'Opp zone' });
  if (form.location.opportunity_zone === false) out.push({ id: 'opp_zone', label: '', val: 'Not opp zone' });
  if (form.location.wetlands_exclude) out.push({ id: 'wetlands', label: '', val: 'No wetlands' });
  if (form.location.tif_district === true) out.push({ id: 'tif', label: '', val: 'TIF district' });
  if (form.location.tif_district === false) out.push({ id: 'tif', label: '', val: 'Not TIF' });
  return out;
}

function fmtRange(min, max) {
  return `${min || 'any'}–${max || 'any'}`;
}

function buildSummary(form) {
  const arr = [];
  form.assets.forEach(a => arr.push({ label: 'Asset', val: assetClassTitle(a) }));
  if (form.subtypes?.length) arr.push({ label: 'Subtypes', val: `${form.subtypes.length} selected` });
  if (form.sub_assets?.length) arr.push({ label: 'Land', val: form.sub_assets.join(', ') });
  if (form.geo.states.length) arr.push({ label: 'States', val: form.geo.states.join(', ') });
  if (form.geo.metros?.length) arr.push({ label: 'Metros', val: form.geo.metros.length === 1 ? form.geo.metros[0] : `${form.geo.metros.length} selected` });
  if (form.geo.counties.length) arr.push({ label: 'Counties', val: `${form.geo.counties.length} selected` });
  if (form.geo.zips.length) arr.push({ label: 'Zips', val: form.geo.zips.join(', ') });
  if (form.phys.sf_min || form.phys.sf_max) arr.push({ label: 'Sqft', val: fmtRange(form.phys.sf_min, form.phys.sf_max) });
  if (form.phys.acres_min || form.phys.acres_max) arr.push({ label: 'Acres', val: fmtRange(form.phys.acres_min, form.phys.acres_max) });
  if (form.phys.year_min || form.phys.year_max) arr.push({ label: 'Year', val: fmtRange(form.phys.year_min, form.phys.year_max) });
  if (form.phys.building_classes?.length) arr.push({ label: 'Class', val: form.phys.building_classes.join('/') });
  if (form.fin.price_min || form.fin.price_max) arr.push({ label: 'Price', val: `${form.fin.price_min ? '$' + form.fin.price_min : 'any'}–${form.fin.price_max ? '$' + form.fin.price_max : 'any'}` });
  if (form.fin.equity_preset) arr.push({ label: 'Equity', val: `≥ ${form.fin.equity_preset}` });
  if (form.owner.entity && form.owner.entity !== 'any') arr.push({ label: 'Entity', val: form.owner.entity });
  if (form.owner.absentee) arr.push({ label: '', val: 'Absentee' });
  if (form.owner.hold_min || form.owner.hold_max) arr.push({ label: 'Hold', val: fmtRange(form.owner.hold_min, form.owner.hold_max) });
  if (form.owner.out_of_state) arr.push({ label: '', val: 'Out-of-state' });
  arr.push({ label: 'Threshold', val: form.threshold === 'volume' ? '70% Volume' : form.threshold === 'precision' ? '90%+ Precision' : '80% Balanced' });
  if (form.signals.length) arr.push({ label: form.logic, val: `${form.signals.length} signals` });
  return arr;
}

function canGoNext(page, form) {
  if (page === 1) return form.assets.length > 0 && form.geo.states.length > 0;
  return true;
}

// useScrollHint — watches a scrollable element and toggles a visibility flag
// based on whether content overflows AND user hasn't scrolled to the bottom.
// Auto-recomputes on resize and content-height changes via ResizeObserver.
function useScrollHint() {
  const contentRef = useRef(null);
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const check = () => {
      const overflow = el.scrollHeight > el.clientHeight;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
      setShowHint(overflow && !atBottom);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, []);
  return { contentRef, showHint };
}

export function BuyBoxWizard({ mode, initialData, onSuccess, onCancel }) {
  const addToast = useToast();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(() => mode === 'edit' && initialData ? toNativeForm(initialData) : { ...NATIVE_FORM });
  const [activating, setActivating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activatedForm, setActivatedForm] = useState(null);
  // previewState drives the slot-machine counter:
  //   'idle'     — no asset class picked yet → show dashes + "Select an asset class to start."
  //   'spinning' — request in-flight or debounce window
  //   'resolved' — real count landed
  //   'error'    — request failed / timed out → show dashes with reason
  const [previewState, setPreviewState] = useState(() => {
    const initialAssets = mode === 'edit' && initialData ? toNativeForm(initialData).assets : [];
    return initialAssets.length > 0 ? 'spinning' : 'idle';
  });
  // errorKind distinguishes which kind of preview failure to surface in the aria/tooltip.
  // 'timeout' = backend 504, 'server' = 500 / 4xx, null = no error.
  const [errorKind, setErrorKind] = useState(null);
  const formRef = useRef(form);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const { contentRef, showHint } = useScrollHint();

  useEffect(() => { formRef.current = form; });

  // Watched: every form field that the matcher honors. Match Threshold (form.threshold)
  // is intentionally excluded — it scores deals at delivery time, not the property
  // pool count. form.name and form.delivery are UI-only and never affect the count.
  const filterKey = JSON.stringify({
    assets: form.assets,
    subtypes: form.subtypes,
    sub_assets: form.sub_assets,
    geo: form.geo,
    phys: form.phys,
    fin: form.fin,
    owner: form.owner,
    signals: form.signals,
    logic: form.logic,
    distress_floor: form.distress_floor,
    utils: form.utils,
    location: form.location,
    flags: form.flags,
  });

  useEffect(() => {
    // Gate: until the user picks an asset class, skip the preview request.
    // A full-table COUNT(*) against properties with no filters would time out.
    if (!form.assets || form.assets.length === 0) {
      clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
      setPreviewState('idle');
      setErrorKind(null);
      setForm(f => (f.matchCount === null ? f : { ...f, matchCount: null }));
      return;
    }

    // Reels start spinning immediately on any input change. The actual request
    // fires after the 400ms debounce so fast typing only produces one network call.
    // Any in-flight request is aborted when a newer one fires so a slow stale
    // response can never overwrite a fresher count.
    setPreviewState('spinning');
    setErrorKind(null);
    clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const payload = nativeToPayload(formRef.current);
        const data = await api.post('/api/dealfeed/buy-boxes/preview', payload, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (typeof data.estimated_count === 'number') {
          setForm(f => ({ ...f, matchCount: data.estimated_count }));
          setPreviewState('resolved');
          setErrorKind(null);
        } else {
          setForm(f => ({ ...f, matchCount: null }));
          setPreviewState('error');
          setErrorKind(data?.errorKind || 'server');
        }
      } catch (err) {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        setForm(f => ({ ...f, matchCount: null }));
        setPreviewState('error');
        setErrorKind(err?.status === 504 ? 'timeout' : 'server');
      }
    }, 400);
    return () => {
      clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [filterKey]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        if (page < 7 && canGoNext(page, formRef.current)) setPage(p => p + 1);
      }
      if (e.key === 'ArrowRight' && e.altKey && page < 7) setPage(p => p + 1);
      if (e.key === 'ArrowLeft' && e.altKey && page > 1) setPage(p => p - 1);
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, onCancel]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const payload = nativeToPayload(form);
      if (mode === 'edit' && initialData?.id) {
        await api.patch(`/api/dealfeed/buy-boxes/${initialData.id}`, payload);
      } else {
        // Switched 2026-05-20: was POST /api/dealfeed/onboarding (which silently
        // dropped the 35 MVP filter fields from migration 049). POST /buy-boxes
        // accepts the full PATCHABLE_FIELDS set including all new filters.
        await api.post('/api/dealfeed/buy-boxes', payload);
      }
      setActivatedForm(form);
      setSubmitted(true);
    } catch (err) {
      addToast(err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setActivating(false);
    }
  };

  const filters = buildFilters(form);
  const summary = buildSummary(form);

  const clearFilter = (id) => {
    const f = form;
    if (id === 'assets') setForm({ ...f, assets: [], subtypes: [], sub_assets: [] });
    else if (id === 'subtypes') setForm({ ...f, subtypes: [] });
    else if (id === 'sub_assets') setForm({ ...f, sub_assets: [] });
    else if (id === 'states') setForm({ ...f, geo: { ...f.geo, states: [], counties: [], metros: [] } });
    else if (id === 'metros') setForm({ ...f, geo: { ...f.geo, metros: [] } });
    else if (id === 'counties') setForm({ ...f, geo: { ...f.geo, counties: [] } });
    else if (id === 'zips') setForm({ ...f, geo: { ...f.geo, zips: [] } });
    else if (id === 'equity') setForm({ ...f, fin: { ...f.fin, equity_preset: '' } });
    else if (id === 'absentee') setForm({ ...f, owner: { ...f.owner, absentee: false } });
    else if (id === 'hold') setForm({ ...f, owner: { ...f.owner, hold_min: '', hold_max: '' } });
    else if (id === 'oos') setForm({ ...f, owner: { ...f.owner, out_of_state: false } });
    else if (id === 'entity') setForm({ ...f, owner: { ...f.owner, entity: '' } });
    else if (id === 'tax_delinquent') setForm({ ...f, signals: (f.signals || []).filter(s => s !== 'tax-delinquent') });
    else if (id === 'active_foreclosure') setForm({ ...f, signals: (f.signals || []).filter(s => s !== 'active-foreclosure') });
    else if (id === 'signals') setForm({ ...f, signals: [] });
    else if (id === 'utils') setForm({ ...f, utils: { water: false, sewer: false, electricity: false, gas: false } });
    else if (id === 'flood') setForm({ ...f, location: { ...f.location, flood_exclude: false } });
    else if (id === 'opp_zone') setForm({ ...f, location: { ...f.location, opportunity_zone: null } });
    else if (id === 'wetlands') setForm({ ...f, location: { ...f.location, wetlands_exclude: false } });
    else if (id === 'tif') setForm({ ...f, location: { ...f.location, tif_district: null } });
  };

  const renderPage = () => {
    switch (page) {
      case 1: return <BuyBoxPage1 form={form} setForm={setForm} />;
      case 2: return <BuyBoxPage2 form={form} setForm={setForm} />;
      case 3: return <BuyBoxPage3 form={form} setForm={setForm} />;
      case 4: return <BuyBoxPage4 form={form} setForm={setForm} />;
      case 5: return <BuyBoxPage5 form={form} setForm={setForm} assetClass={form.assets[0]} />;
      case 6: return <BuyBoxPage6 form={form} setForm={setForm} />;
      case 7: return <BuyBoxPage7 form={form} setForm={setForm} matchCount={form.matchCount} previewState={previewState} errorKind={errorKind} summary={summary} onActivate={handleActivate} activating={activating} goToStep={setPage} />;
      default: return null;
    }
  };

  return (
    <div className="buy-box-wizard">
      <div className="backdrop" />
      {submitted && (
        <BuyBoxActivatedDialog
          box={{
            label: activatedForm?.name || 'Your buy box',
            run_schedule: activatedForm?.delivery?.cadence === 'weekly'
              ? { days: ['mon'] }
              : { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
            delivery_max_per_run: activatedForm?.delivery?.max,
          }}
          matchCount={typeof activatedForm?.matchCount === 'number' ? activatedForm.matchCount : null}
          cadenceOverride={activatedForm?.delivery?.cadence}
          onBuildAnother={() => {
            setSubmitted(false);
            setActivatedForm(null);
            setPage(1);
            setForm({ ...NATIVE_FORM });
          }}
          onClose={onSuccess}
        />
      )}
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="brand-logo-mark" aria-label="Nightdrop" />
            <span className="brand-sep">›</span>
            <span className="brand-context">{mode === 'edit' ? 'Edit buy box' : 'New buy box'}</span>
          </div>

          <div className="stepper">
            {STEPS.map((s, i) => (
              <Fragment key={s.id}>
                <button
                  className={`step${page === s.id ? ' active' : page > s.id ? ' done' : ''}`}
                  onClick={() => { if (page > s.id) setPage(s.id); }}
                >
                  <span className="step-num">
                    <span className="step-num-text mono">{String(s.id).padStart(2, '0')}</span>
                  </span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <span className={`step-bar${page > s.id ? ' done' : ''}`} />}
              </Fragment>
            ))}
          </div>

          <div className="topbar-right">
            <button className="icon-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous step">←</button>
            <button className="icon-btn" onClick={() => page < 7 && canGoNext(page, form) && setPage(p => p + 1)} disabled={page === 7 || !canGoNext(page, form)} aria-label="Next step">→</button>
            <span style={{ margin: '0 8px', color: 'var(--border-hi)' }}>|</span>
            <span>Next</span>
            <span className="kbd">⌘↵</span>
            <button className="icon-btn" style={{ marginLeft: 8 }} onClick={onCancel} aria-label="Close">
              <Ic.close width="16" height="16" />
            </button>
          </div>
        </header>

        <div className="main">
          <div className="content-col">
            <main className="content" ref={contentRef}>
              <div className="content-inner">{renderPage()}</div>
            </main>
            {showHint && (
              <div className="scroll-hint" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            )}
            <footer className="footer">
              <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <Ic.arrowL width="14" height="14" /> Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 11, color: 'var(--fg-mute)' }}>
                  Step {page} of 7 · <SlotMachineCounter value={form.matchCount} state={previewState} errorKind={errorKind} />
                  {previewState === 'idle' ? ' Select an asset class to start.' : ' matches'}
                </span>
                {page < 7 ? (
                  <button className="btn btn-primary" onClick={() => setPage(p => p + 1)} disabled={!canGoNext(page, form)}>
                    Continue <span className="kbd">⌘↵</span>
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={handleActivate} disabled={activating || !form.name.trim()}>
                    {activating ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Review & activate'}
                  </button>
                )}
              </div>
            </footer>
          </div>

          <BuyBoxRightRail matchCount={form.matchCount} previewState={previewState} errorKind={errorKind} filters={filters} geoStates={form.geo.states} onRemoveFilter={clearFilter} form={form} />
        </div>
      </div>
    </div>
  );
}
