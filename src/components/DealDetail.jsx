import { useState, useEffect } from 'react';
import { Phone, Share2, Star } from 'lucide-react';
import { ContactLogModal } from './ContactLogModal.jsx';
import { Rows, SecHead, ConfBadge } from './DealDetail.helpers.jsx';
import { OwnerPortfolio } from './OwnerPortfolio.jsx';
import { SectionNav } from './DealDetail/SectionNav.jsx';
import { ScoreScale } from './DealDetail/ScoreScale.jsx';
import { StageIndicator } from './DealDetail/StageIndicator.jsx';
import { BreadcrumbStrip } from './DealDetail/BreadcrumbStrip.jsx';
import { IdentityColumn } from './DealDetail/IdentityColumn.jsx';
import { WhyFlaggedCard } from './DealDetail/WhyFlaggedCard.jsx';
import { PipelineStatusCard } from './DealDetail/PipelineStatusCard.jsx';
import { NarrativeSection } from './DealDetail/NarrativeSection.jsx';
import { RecommendedAction } from './DealDetail/RecommendedAction.jsx';
import { fmt, fmtMoney, hasVal } from '../lib/format.js';
import { useDeals } from '../contexts/DealsContext.jsx';
import { useReadState } from '../contexts/ReadStateContext';
import { useToast } from '../contexts/ToastContext';
import { useStickyCollapse } from '../hooks/useStickyCollapse.js';
import '../styles/deal-detail.css';

function hasRows(rows) {
  return rows.some(([, v]) => v != null && v !== '' && v !== '—' && v !== 'null' && v !== 'undefined');
}


function pct(v) {
  if (!hasVal(v)) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : (n * 100).toFixed(1) + '%';
}
function mon(v) {
  if (!hasVal(v)) return null;
  return fmtMoney(v);
}
function sfVal(v) {
  if (!hasVal(v)) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n.toLocaleString() + ' sf';
}
function climateScore(v) {
  if (!hasVal(v)) return null;
  const n = parseFloat(v);
  if (isNaN(n) || n === -1) return null;
  return String(Math.round(n)) + '/10';
}
function boolFmt(v) {
  return v != null ? (v ? 'Yes' : 'No') : null;
}

export function DealDetail({ deal, onClose, deals, dealIndex, onNavigateDeal }) {
  const { postFeedback, toggleSaved, updateStatus, logContact, fetchContacts, contacts, dealNotes, fetchDealNotes, createDealNote } = useDeals();
  const { markRead } = useReadState();
  const addToast = useToast();
  const collapsed = useStickyCollapse(120);
  const [hotLoading, setHotLoading] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => { markRead(deal.id); }, [deal.id, markRead]);
  useEffect(() => { fetchContacts(deal.id); }, [deal.id, fetchContacts]);
  useEffect(() => { fetchDealNotes(deal.id); }, [deal.id, fetchDealNotes]);

  const bj = deal.briefJson || deal.brief_json || {};
  const cr = bj.climate || {};
  const fc = bj.foreclosure || {};
  const attomId = deal.attomId || deal.attom_id;
  const enriched = bj.enriched_at || deal.updated_at;
  const score = deal.distress_score ?? deal.score;
  const city = [deal.city, deal.state].filter(Boolean).join(', ');
  const cityMsa = [city, deal.msa].filter(Boolean).join(' · ');
  const line2Parts = [cityMsa, deal.asset_class || deal.use_type].filter(Boolean);
  const currentStatus = deal.status || 'new';
  const dealContactList = contacts[deal.id] || [];
  const dealNotesList = dealNotes[deal.id] || [];
  const signals = bj.signal_tags || bj.distress_signals || deal.signals || [];

  function ownerDistanceCell() {
    const mailing = deal.owner_mailing || bj.owner_mailing;
    if (!mailing) return null;
    const match = mailing.match(/\b([A-Z]{2})\b/);
    if (!match) return null;
    const ownerState = match[1];
    if (!deal.state) return ownerState;
    return ownerState === deal.state ? 'Local' : `Out of State (${ownerState})`;
  }

  async function handleMarkHot() {
    setHotLoading(true);
    try { await postFeedback(deal.id, deal.feedback === 'hot' ? null : 'hot'); }
    finally { setHotLoading(false); }
  }

  async function handleStatusChange(newStatus) {
    await updateStatus(deal.id, newStatus);
    addToast(`Stage updated`, 'success');
  }

  async function handleShare() {
    const url = `${window.location.origin}/deal/${deal.id}`;
    try {
      await navigator.clipboard.writeText(url);
      addToast('Link copied — recipient must be a Nightdrop subscriber.', 'success');
    } catch {
      addToast('Could not copy link', 'error');
    }
  }

  async function handleToggleSaved() {
    const next = !deal.saved;
    await toggleSaved(deal.id, next);
    addToast(next ? 'Added to your list' : 'Removed from your list', next ? 'success' : 'info');
  }

  async function handleToggleNotRelevant() {
    const isUndo = deal.feedback === 'not_relevant';
    await postFeedback(deal.id, isUndo ? null : 'not_relevant');
    addToast(
      isUndo ? 'Marked relevant again' : 'Marked as not relevant',
      isUndo ? 'info' : 'success'
    );
    if (!isUndo && onClose) onClose();
  }

  async function handleLogContact(formData) {
    setContactSubmitting(true);
    try { await logContact(deal.id, formData); setContactModalOpen(false); }
    finally { setContactSubmitting(false); }
  }

  async function handleAddNote() {
    if (!noteInput.trim()) return;
    setNoteSaving(true);
    try { await createDealNote(deal.id, noteInput.trim()); setNoteInput(''); }
    finally { setNoteSaving(false); }
  }

  const propertyRows = [
    ['Parcel ID',      fmt(deal.parcel_id ?? attomId)],
    ['APN',            fmt(deal.apn ?? bj.apn)],
    ['Address',        fmt(deal.address)],
    ['City / State',   city || null],
    ['Zip',            fmt(deal.zip)],
    ['County',         fmt(deal.county)],
    ['MSA',            fmt(deal.msa)],
    ['Asset Class',    fmt(deal.asset_class)],
    ['Use Type',       fmt(deal.use_type)],
    ['Zoning Code',    fmt(bj.zoning_code || deal.zoning) === '—' ? null : fmt(bj.zoning_code || deal.zoning)],
    ['Year Built',     fmt(deal.year_built)],
    ['Stories',        fmt(deal.stories)],
    ['Units',          fmt(deal.units)],
    ['Sq Ft (Bldg)',   sfVal(deal.building_sf)],
    ['Lot Sq Ft',      sfVal(deal.lot_sf ?? bj.lot_sf)],
    ['Lot Acres',      bj.lot_ac ?? deal.acres ? (bj.lot_ac ?? deal.acres) + ' ac' : null],
  ];

  const ownershipRows = [
    ['Owner Name',    fmt(deal.owner_name)],
    ['Entity Type',   fmt(bj.entity_type ?? deal.owner_type)],
    ['Mailing Addr',  fmt(bj.owner_mailing ?? deal.owner_mailing)],
    ['Owner Since',   fmt(bj.owner_since ?? deal.owner_since)],
    ['Hold Period',   bj.hold_years ? bj.hold_years + ' yrs' : null],
    ['Absentee',      boolFmt(deal.absentee_owner)],
    ['Out of State',  boolFmt(deal.owner_is_out_of_state)],
    ['Phone',         fmt(bj.dm?.phone)],
    ['Email',         fmt(bj.dm?.email)],
  ];

  const financialsRows = [
    ['Assessed Value',    mon(deal.assessed_value ?? bj.assessed_value)],
    ['Land Value',        mon(bj.land_value ?? bj.assessed_value_land)],
    ['Impr. Value',       mon(bj.improvement_value ?? bj.assessed_value_improvements)],
    ['Market Value',      mon(bj.market_value ?? bj.market_value_total)],
    ['AVM',               mon(bj.avm)],
    ['Value / Acre',      mon(bj.assessed_value_per_acre)],
    ['Value / SF',        mon(bj.assessed_value_per_sf)],
    ['Tax Year',          fmt(bj.tax_year ?? deal.tax_year)],
    ['Annual Tax',        mon(bj.tax_amount_billed ?? bj.tax_amount ?? deal.tax_amount_billed)],
    ['Tax Delinquent Yr', hasVal(bj.tax_delinquent_year ?? deal.tax_delinquent_year) ? fmt(bj.tax_delinquent_year ?? deal.tax_delinquent_year) : null],
    ['Homeowner Exempt',  boolFmt(bj.has_homeowner_exemption ?? deal.has_homeowner_exemption)],
    ['NOI Est.',          mon(bj.noi_est)],
    ['Cap Rate Est.',     pct(bj.cap_rate)],
    ['Last Sale Price',   mon(deal.last_sale_price)],
    ['Last Sale Date',    fmt(deal.last_sale_date)],
    ['Rental Value',      mon(bj.estimated_rental_value)],
  ];

  const hasLoan = hasVal(bj.loan_amount) || hasVal(bj.lender) || hasVal(bj.first_loan_amount);
  const loanRows = [
    ['Lender',           fmt(bj.lender ?? bj.first_lender_name)],
    ['Loan Amount',      mon(bj.loan_amount ?? bj.first_loan_amount)],
    ['Rate',             pct(bj.rate)],
    ['Term',             bj.term ? bj.term + ' mo' : null],
    ['Loan Due',         fmt(bj.due)],
    ['Loan Age',         bj.loan_age_years ? bj.loan_age_years + ' yrs' : null],
    ['LTV',              pct(bj.ltv)],
    ['Available Equity', mon(bj.available_equity)],
    ['2nd Loan',         mon(bj.second_loan_amount)],
  ];

  const foreclosureRows = [
    ['Status',         fmt(fc.foreclosure_status ?? deal.foreclosure_status)],
    ['Record Type',    fmt(fc.record_type ?? deal.record_type)],
    ['Recording Date', fmt(fc.foreclosure_recording_date ?? deal.foreclosure_recording_date)],
    ['Original Loan',  mon(fc.original_loan_amount ?? deal.original_loan_amount)],
    ['Default Amount', mon(fc.default_amount ?? deal.default_amount)],
    ['Lender',         fmt(fc.lender_name_standardized ?? deal.lender_name_standardized)],
    ['Borrower',       fmt(fc.borrower_name ?? deal.borrower_name)],
    ['Auction Date',   fmt(fc.auction_date ?? deal.auction_date)],
    ['Opening Bid',    mon(fc.auction_opening_bid ?? deal.auction_opening_bid)],
  ];

  const climateRows = [
    ['Heat Risk',     climateScore(cr.heat_risk_score ?? deal.heat_risk_score)],
    ['Storm Risk',    climateScore(cr.storm_risk_score ?? deal.storm_risk_score)],
    ['Wildfire Risk', climateScore(cr.wildfire_risk_score ?? deal.wildfire_risk_score)],
    ['Drought Risk',  climateScore(cr.drought_risk_score ?? deal.drought_risk_score)],
    ['Flood Risk',    climateScore(cr.flood_risk_score ?? deal.flood_risk_score)],
    ['Total Risk',    climateScore(cr.total_risk_score ?? deal.total_risk_score)],
    ['Flood Zone',    fmt(cr.fema_flood_zone ?? deal.fema_flood_zone)],
    ['In Floodplain', boolFmt(cr.in_floodplain ?? deal.in_floodplain)],
    ['In Floodway',   boolFmt(cr.in_floodway ?? deal.in_floodway)],
  ];

  const siteRows = [
    ['Lot Sq Ft',      sfVal(deal.lot_sf ?? bj.lot_sf)],
    ['Lot Acres',      bj.lot_ac ?? deal.acres ? (bj.lot_ac ?? deal.acres) + ' ac' : null],
    ['Building Sq Ft', sfVal(deal.building_sf)],
    ['Stories',        fmt(deal.stories)],
    ['Units',          fmt(deal.units)],
    ['Parking',        fmt(bj.parking_spaces ?? deal.parking_space_count)],
    ['Construction',   fmt(bj.construction_type ?? deal.construction_type)],
    ['Exterior Walls', fmt(bj.exterior_walls ?? deal.exterior_walls)],
    ['Roof Type',      fmt(bj.roof_type ?? deal.roof_type)],
    ['Foundation',     fmt(bj.foundation ?? deal.foundation)],
    ['HVAC Cooling',   fmt(bj.hvac_cooling ?? deal.hvac_cooling)],
    ['HVAC Heating',   fmt(bj.hvac_heating ?? deal.hvac_heating)],
    ['Has Pool',       boolFmt(bj.has_pool ?? deal.has_pool)],
    ['Has Elevator',   boolFmt(bj.has_elevator ?? deal.has_elevator)],
    ['Sprinklers',     boolFmt(bj.has_fire_sprinklers ?? deal.has_fire_sprinklers)],
    ['Yr Renovated',   fmt(bj.year_renovated)],
  ];

  const zoningRows = [
    ['Zoning Code',     fmt(bj.zoning_code || deal.zoning) === '—' ? null : fmt(bj.zoning_code || deal.zoning)],
    ['Jurisdiction',    fmt(deal.city_jurisdiction)],
    ['In ETJ',          boolFmt(deal.in_etj)],
    ['ETJ City',        fmt(deal.etj_city)],
    ['Future Land Use', fmt(bj.future_land_use ?? deal.future_land_use)],
    ['Opp. Zone',       boolFmt(bj.in_opportunity_zone ?? deal.in_opportunity_zone)],
    ['TIF District',    fmt(bj.tif_district ?? deal.tif_district)],
    ['Permit Count 5yr',hasVal(bj.permit_count_5yr ?? deal.permit_count_5yr) ? String(bj.permit_count_5yr ?? deal.permit_count_5yr) : null],
    ['Last Permit',     fmt(bj.last_permit_date ?? deal.last_permit_date)],
    ['Last Permit Type',fmt(bj.last_permit_type ?? deal.last_permit_type)],
  ];

  const contextRows = [
    ['Submarket',       fmt(deal.submarket)],
    ['MSA',             fmt(deal.msa)],
    ['County',          fmt(deal.county)],
    ['FIPS',            fmt(deal.fips ?? bj.fips)],
    ['Census Tract',    fmt(deal.census_tract ?? bj.census_tract)],
    ['School District', fmt(deal.school_district)],
    ['Median HH Income',mon(deal.median_hh_income)],
    ['% Renter Occ.',   hasVal(deal.pct_renter_occupied) ? (parseFloat(deal.pct_renter_occupied) * 100).toFixed(1) + '%' : null],
    ['Nearest Road',    deal.nearest_road_name ? `${deal.nearest_road_name}${deal.nearest_road_aadt ? ` (${Number(deal.nearest_road_aadt).toLocaleString()} AADT)` : ''}` : null],
    ['Latitude',        deal.lat ? deal.lat.toFixed(6) : null],
    ['Longitude',       deal.lng ? deal.lng.toFixed(6) : null],
  ];

  const riskRows = [
    ['Distress Score',    hasVal(score) ? String(Math.round(parseFloat(score))) : null],
    ['Distress Tier',     fmt(deal.distress_tier)],
    ['Seller Motivation', hasVal(bj.seller_motivation_score ?? deal.seller_motivation_score) ? String(bj.seller_motivation_score ?? deal.seller_motivation_score) : null],
    ['Tax Delinquent',    fmt(deal.tax_delinquent ?? deal.tax_delinquent_year ?? bj.tax_delinquent_year)],
    ['Liens',             fmt(deal.liens)],
    ['Code Violations',   fmt(deal.code_violations)],
    ['Vacancy Est.',      fmt(deal.vacancy_est)],
  ];

  const dealIntelRows = [
    ['Match Score',       hasVal(deal.match_score) ? String(deal.match_score) : null],
    ['Buy Box',           fmt(deal.buy_box_name)],
    ['Status',            fmt(deal.status)],
    ['Deal State',        fmt(deal.deal_state)],
    ['Days Active',       hasVal(deal.days) ? String(deal.days) + ' days' : null],
    ['Feedback',          fmt(deal.feedback)],
    ['Source',            fmt(deal.source)],
    ['Enriched',          fmt(enriched)],
    ['Assemblage Score',  hasVal(bj.assemblage_score ?? deal.assemblage_score) ? String(bj.assemblage_score ?? deal.assemblage_score) : null],
    ['Dev. Potential',    hasVal(bj.development_potential_score ?? deal.development_potential_score) ? String(bj.development_potential_score ?? deal.development_potential_score) : null],
    ['Same-Owner Parcels',hasVal(deal.same_owner_parcel_count) ? String(deal.same_owner_parcel_count) : null],
  ];

  const salesHistory = Array.isArray(bj.sales_history) ? bj.sales_history : [];

  const metrics = [
    { label: 'Assessed Value', value: mon(deal.assessed_value ?? bj.assessed_value) },
    { label: 'Lot Size',       value: sfVal(deal.lot_sf ?? bj.lot_sf) || (bj.lot_ac ? bj.lot_ac + ' ac' : null) },
    { label: 'Year Built',     value: fmt(deal.year_built) },
    { label: 'Hold Period',    value: bj.hold_years ? bj.hold_years + ' yrs' : null },
    { label: 'Owner Distance', value: ownerDistanceCell() },
  ];

  const showProperty    = hasRows(propertyRows);
  const showOwnership   = hasRows(ownershipRows);
  const showFinancials  = hasRows(financialsRows);
  const showCapital     = hasLoan || hasRows(loanRows);
  const showTransactions = salesHistory.length > 0 || hasVal(deal.last_sale_date) || hasVal(deal.last_sale_price);
  const showSite        = hasRows(siteRows);
  const showZoning      = hasRows(zoningRows);
  const showContext     = hasRows(contextRows);
  const showForeclosure = hasRows(foreclosureRows);
  const showClimate     = hasRows(climateRows);
  const showRisk        = hasRows(riskRows);
  const showDealIntel   = hasRows(dealIntelRows);
  const showPortfolio   = !!attomId;

  const sectionDefs = [
    { id: 'dd-brief',       label: 'Brief',           show: true },
    { id: 'dd-property',    label: 'Property',        show: showProperty },
    { id: 'dd-ownership',   label: 'Ownership',       show: showOwnership },
    { id: 'dd-financials',  label: 'Financials',      show: showFinancials },
    { id: 'dd-capital',     label: 'Loans & Equity',  show: showCapital },
    { id: 'dd-transactions',label: 'Sales History',   show: showTransactions },
    { id: 'dd-site',        label: 'Site & Lot',      show: showSite },
    { id: 'dd-zoning',      label: 'Zoning',          show: showZoning },
    { id: 'dd-context',     label: 'Location',        show: showContext },
    { id: 'dd-foreclosure', label: 'Foreclosure',     show: showForeclosure },
    { id: 'dd-climate',     label: 'Climate',         show: showClimate },
    { id: 'dd-risk',        label: 'Risk',            show: showRisk },
    { id: 'dd-dealintel',   label: 'Deal Intel',      show: showDealIntel },
    { id: 'dd-portfolio',   label: 'Owner Portfolio', show: showPortfolio },
    { id: 'dd-notes',       label: 'Notes',           show: true },
  ].filter((s) => s.show);

  return (
    <div className="dd-root">
      <BreadcrumbStrip
        onBack={onClose}
        dealIndex={dealIndex ?? -1}
        totalDeals={deals?.length ?? 0}
        onPrev={() => onNavigateDeal && onNavigateDeal(deals[dealIndex - 1])}
        onNext={() => onNavigateDeal && onNavigateDeal(deals[dealIndex + 1])}
        onShare={handleShare}
        saved={!!deal.saved}
        onToggleSaved={handleToggleSaved}
        isHot={deal.feedback === 'hot'}
        onToggleHot={handleMarkHot}
        hotLoading={hotLoading}
        isNotRelevant={deal.feedback === 'not_relevant'}
        onToggleNotRelevant={handleToggleNotRelevant}
        onCopyLink={handleShare}
      />
      <SectionNav sections={sectionDefs} />
      <StageIndicator status={currentStatus} onStageChange={handleStatusChange} />
      <div className="dd-nav-band" />

      <div className={`dd-sticky-header${collapsed ? ' collapsed' : ''}`}>
        <div className="dd-addr-bar">
          <div className="dd-addr-identity">
            <span className="dd-addr-line1">{deal.address || 'Unknown Address'}</span>
            {!collapsed && line2Parts.length > 0 && (
              <span className="dd-addr-line2">{line2Parts.join(' · ')}</span>
            )}
            {!collapsed && onClose && (
              <button className="dd-addr-back" onClick={onClose}>← Back to deals</button>
            )}
          </div>
          {!collapsed && (
            <>
              <div className="dd-addr-divider" />
              <div className="dd-addr-metrics">
                {metrics.map(m => (
                  <div key={m.label} className="dd-addr-metric-cell">
                    <span className="dd-addr-metric-label">{m.label}</span>
                    <span className="dd-addr-metric-value">{m.value || '—'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="dd-addr-divider" />
          <div className="dd-addr-actions">
            <ScoreScale score={score} compact={collapsed} />
            <button
              className={`dd-action dd-action-primary${deal.feedback === 'hot' ? ' active' : ''}`}
              onClick={handleMarkHot}
              disabled={hotLoading}
              title={deal.feedback === 'hot' ? 'Unmark as Hot' : 'Mark as Hot'}
            >
              <Star size={14} strokeWidth={2.4} fill={deal.feedback === 'hot' ? 'currentColor' : 'none'} />
              <span className="dd-action-label">{deal.feedback === 'hot' ? 'Hot' : 'Mark as Hot'}</span>
            </button>
            <button
              className={`dd-action dd-action-secondary${deal.feedback === 'not_relevant' ? ' active' : ''}`}
              onClick={async () => {
                const isUndo = deal.feedback === 'not_relevant';
                await postFeedback(deal.id, isUndo ? null : 'not_relevant');
                addToast(
                  isUndo ? 'Marked relevant again' : 'Marked as not relevant',
                  isUndo ? 'info' : 'success'
                );
                if (!isUndo && onClose) onClose();
              }}
              title={deal.feedback === 'not_relevant' ? 'Undo not relevant' : 'Not relevant'}
            >
              <span className="dd-action-label">{deal.feedback === 'not_relevant' ? '✓ Not Relevant' : 'Not Relevant'}</span>
            </button>
            <button
              className="dd-action dd-action-icon"
              onClick={() => setContactModalOpen(true)}
              title="Log contact"
              aria-label="Log contact"
            >
              <Phone size={14} strokeWidth={2.2} />
              <span className="dd-action-label">Contact</span>
            </button>
            <button
              className="dd-action dd-action-icon"
              onClick={handleShare}
              title="Copy shareable link"
              aria-label="Share deal"
            >
              <Share2 size={14} strokeWidth={2.2} />
              <span className="dd-action-label">Share</span>
            </button>
            {onClose && (
              <button className="dd-btn close-btn" onClick={onClose} aria-label="Close">&times;</button>
            )}
          </div>
        </div>

      </div>

      <div className="dd-upper-grid">
        <IdentityColumn deal={deal} />
        <WhyFlaggedCard deal={deal} signals={signals} />
        <PipelineStatusCard deal={deal} />
      </div>

      <div className="dd-narrative-wrap">
        <NarrativeSection deal={deal} />
        <RecommendedAction deal={deal} />
      </div>

      <div className="dd-body" style={{ flex: 1 }}>
        <div className="dd-cols">

          <div className="dd-col">

            {showProperty && (
            <div id="dd-property" className="dd-sec dd-card">
              <SecHead title="Property Record" date={enriched} />
              <div className="dd-sec-body">
                <Rows data={propertyRows} />
                <p className="dd-sec-source">Source: Nightdrop Data · County Assessor Records</p>
              </div>
            </div>
            )}

            {showOwnership && (
            <div id="dd-ownership" className="dd-sec dd-card">
              <SecHead title="Ownership &amp; Skip Trace" date={enriched} />
              <div className="dd-sec-body">
                <Rows data={ownershipRows} />
                {(bj.dm?.phoneConf || bj.dm?.emailConf) && (
                  <div className="dd-conf-row">
                    {bj.dm?.phoneConf && <span className="dd-conf-label">Phone <ConfBadge conf={bj.dm.phoneConf} /></span>}
                    {bj.dm?.emailConf && <span className="dd-conf-label">Email <ConfBadge conf={bj.dm.emailConf} /></span>}
                  </div>
                )}
                {dealContactList.length > 0 && (
                  <div className="dd-contact-history">
                    <span className="dd-contact-history-label">Contact History</span>
                    <div className="dd-contact-thread">
                      {dealContactList.map((c, i) => (
                        <div key={i} className="dd-contact-entry">
                          <div className="dd-contact-header">
                            <span className="dd-contact-channel">{c.channel}</span>
                            <span className="dd-contact-outcome">{(c.outcome || '').replace(/_/g, ' ')}</span>
                            <span className="dd-contact-date">
                              {c.contacted_at ? new Date(c.contacted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </span>
                          </div>
                          {c.notes && <p className="dd-contact-notes">{c.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="dd-sec-source">Source: Nightdrop Skip Trace</p>
              </div>
            </div>
            )}

            {showFinancials && (
            <div id="dd-financials" className="dd-sec dd-card">
              <SecHead title="Financial Picture" date={enriched} />
              <div className="dd-sec-body">
                <Rows data={financialsRows} />
                <p className="dd-sec-source">Source: Nightdrop AVM · County Assessor · Tax Records</p>
              </div>
            </div>
            )}

            {showCapital && (
            <div id="dd-capital" className="dd-sec dd-card">
              <SecHead title="Loans &amp; Equity" date={enriched} />
              <div className="dd-sec-body">
                {hasLoan ? (
                  <table className="dd-table">
                    <thead><tr><th>Lender</th><th>Amount</th><th>Rate</th><th>Due</th></tr></thead>
                    <tbody>
                      <tr>
                        <td>{fmt(bj.lender ?? bj.first_lender_name)}</td>
                        <td>{mon(bj.loan_amount ?? bj.first_loan_amount)}</td>
                        <td>{pct(bj.rate)}</td>
                        <td className="muted">{fmt(bj.due)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <Rows data={loanRows} />
                )}
                <p className="dd-sec-source">Source: Nightdrop Mortgage Data · FFIEC HMDA</p>
              </div>
            </div>
            )}

            {showTransactions && (
            <div id="dd-transactions" className="dd-sec dd-card">
              <SecHead title="Sales History" date={enriched} />
              <div className="dd-sec-body">
                {salesHistory.length > 0 ? (
                  <table className="dd-table">
                    <thead><tr><th>Date</th><th>Price</th><th>Buyer</th><th>Seller</th></tr></thead>
                    <tbody>
                      {salesHistory.map((s, i) => (
                        <tr key={i}>
                          <td>{fmt(s.date ?? s.sale_date)}</td>
                          <td>{mon(s.price ?? s.sale_price)}</td>
                          <td className="muted">{fmt(s.buyer)}</td>
                          <td className="muted">{fmt(s.seller)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (deal.last_sale_date || deal.last_sale_price) ? (
                  <table className="dd-table">
                    <thead><tr><th>Date</th><th>Price</th></tr></thead>
                    <tbody>
                      <tr>
                        <td>{fmt(deal.last_sale_date)}</td>
                        <td>{mon(deal.last_sale_price)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <span style={{ color: 'var(--fg-4)', fontSize: 'var(--t-cap)' }}>No transaction history available</span>
                )}
                <p className="dd-sec-source">Source: Nightdrop Data · County Deed Records</p>
              </div>
            </div>
            )}

          </div>

          <div className="dd-col">

            {showSite && (
            <div id="dd-site" className="dd-sec dd-card">
              <SecHead title="Site, Lot &amp; Physical" date={enriched} />
              <div className="dd-sec-body">
                <Rows data={siteRows} />
                <p className="dd-sec-source">Source: Nightdrop Data · County GIS · ATTOM</p>
              </div>
            </div>
            )}

            {showZoning && (
            <div id="dd-zoning" className="dd-sec dd-card">
              <SecHead title="Zoning &amp; Development" date={enriched} />
              <div className="dd-sec-body">
                <Rows data={zoningRows} />
                <p className="dd-sec-source">Source: City/County Zoning · GIS Profile · Building Permits</p>
              </div>
            </div>
            )}

            {showContext && (
            <div id="dd-context" className="dd-sec dd-card">
              <SecHead title="Location Context" date={enriched} />
              <div className="dd-sec-body">
                <Rows data={contextRows} />
                <p className="dd-sec-source">Source: US Census · HUD · CoStar Submarket</p>
              </div>
            </div>
            )}

            {showForeclosure && (
            <div id="dd-foreclosure" className="dd-sec dd-card">
              <SecHead title="Foreclosure" date={enriched} />
              <div className="dd-sec-body">
                <Rows data={foreclosureRows} />
                <p className="dd-sec-source">Source: County Deed Records · Foreclosure Records</p>
              </div>
            </div>
            )}

            {showClimate && (
            <div id="dd-climate" className="dd-sec dd-card">
              <SecHead title="Climate Risk" date={enriched} />
              <div className="dd-sec-body">
                <Rows data={climateRows} />
                <p className="dd-sec-source">Source: First Street Foundation · FEMA · ATTOM</p>
              </div>
            </div>
            )}

            {showRisk && (
            <div id="dd-risk" className="dd-sec dd-card">
              <SecHead title="Risk" date={enriched} />
              <div className="dd-sec-body">
                <Rows data={riskRows} />
                <p className="dd-sec-source">Source: Nightdrop Distress Model · County Records</p>
              </div>
            </div>
            )}

            {showDealIntel && (
            <div id="dd-dealintel" className="dd-sec dd-card">
              <SecHead title="Deal Intel" date={enriched} />
              <div className="dd-sec-body">
                <Rows data={dealIntelRows} />
                <p className="dd-sec-source">Source: Nightdrop Deal Engine</p>
              </div>
            </div>
            )}

          </div>

        </div>

        {attomId && (
          <div id="dd-portfolio" className="dd-sec dd-card dd-portfolio-sec">
            <SecHead title="Owner Portfolio" />
            <div className="dd-sec-body">
              <OwnerPortfolio deal={deal} />
            </div>
          </div>
        )}

        <div className="dd-footer-bar">
          <span>
            Data sourced from Parcyl, County Records, and public data.
            All values are estimates and should be independently verified.
          </span>
          <span className="dd-footer-right">
            Parcyl · {deal.address || 'Deal Detail'} · {enriched ? `Updated ${fmt(enriched)}` : 'Live Data'}
          </span>
        </div>

        <div id="dd-notes" className="dd-sec dd-card dd-notes-log">
          <SecHead title="Notes" />
          <div className="dd-sec-body">
            <div className="dd-note-compose">
              <textarea
                className="dd-note-input"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                placeholder="Add a note…"
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote(); }}
              />
              <button
                className="dd-btn primary dd-add-note-btn"
                onClick={handleAddNote}
                disabled={noteSaving || !noteInput.trim()}
              >
                {noteSaving ? 'Saving…' : 'Add Note'}
              </button>
            </div>
            {dealNotesList.length > 0 && (
              <div className="dd-notes-thread">
                {dealNotesList.map((n, i) => (
                  <div key={i} className="dd-note-entry">
                    <div className="dd-note-header">
                      <span className="dd-note-author">{n.author_name || 'You'}</span>
                      <span className="dd-note-date">
                        {n.created_at ? new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    <p className="dd-note-text">{n.note_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {contactModalOpen && (
        <ContactLogModal
          onSubmit={handleLogContact}
          onClose={() => setContactModalOpen(false)}
          submitting={contactSubmitting}
        />
      )}
    </div>
  );
}
