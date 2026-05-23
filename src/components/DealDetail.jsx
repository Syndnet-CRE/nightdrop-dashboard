import { useState, useEffect, useRef } from 'react';
import { Phone } from 'lucide-react';
import { AerialThumb } from './AerialThumb.jsx';
import { ContactLogModal } from './ContactLogModal.jsx';
import { Rows, SecHead, Chip, ConfBadge } from './DealDetail.helpers.jsx';
import { OwnerPortfolio } from './OwnerPortfolio.jsx';
import { SectionNav } from './DealDetail/SectionNav.jsx';
import { fmt, fmtMoney, hasVal } from '../lib/format.js';
import { useDeals } from '../contexts/DealsContext.jsx';
import { useReadState } from '../contexts/ReadStateContext';
import { useToast } from '../contexts/ToastContext';
import '../styles/deal-detail.css';

function hasRows(rows) {
  return rows.some(([, v]) => v != null && v !== '' && v !== '—' && v !== 'null' && v !== 'undefined');
}

const STATUS_OPTIONS = ['new', 'due_diligence', 'contacted', 'negotiating', 'offer_made', 'dead'];
const STATUS_LABELS = { new: 'New', due_diligence: 'Due Diligence', contacted: 'Contacted', negotiating: 'Negotiating', offer_made: 'Offer Made', dead: 'Dead' };
const STATUS_COLORS = { new: 'gray', due_diligence: 'blue', contacted: 'amber', negotiating: 'amber', offer_made: 'green', dead: 'red' };

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
function scoreVariant(score) {
  if (!hasVal(score)) return 'none';
  const n = parseFloat(score);
  if (isNaN(n)) return 'none';
  if (n >= 70) return 'hi';
  if (n >= 40) return 'md';
  return 'lo';
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
  const { postFeedback, updateStatus, logContact, fetchContacts, contacts, dealNotes, fetchDealNotes, createDealNote } = useDeals();
  const { markRead } = useReadState();
  const addToast = useToast();
  const [hotLoading, setHotLoading] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const statusRef = useRef(null);

  useEffect(() => { markRead(deal.id); }, [deal.id, markRead]);
  useEffect(() => { fetchContacts(deal.id); }, [deal.id, fetchContacts]);
  useEffect(() => { fetchDealNotes(deal.id); }, [deal.id, fetchDealNotes]);

  useEffect(() => {
    if (!showStatusDropdown) return;
    function onOutside(e) {
      if (statusRef.current && !statusRef.current.contains(e.target)) setShowStatusDropdown(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [showStatusDropdown]);

  const bj = deal.briefJson || deal.brief_json || {};
  const cr = bj.climate || {};
  const fc = bj.foreclosure || {};
  const attomId = deal.attomId || deal.attom_id;
  const enriched = bj.enriched_at || deal.updated_at;
  const score = deal.distress_score ?? deal.score;
  const variant = scoreVariant(score);
  const scoreLabel = hasVal(score) ? `Score ${Math.round(parseFloat(score))}` : 'No Score';
  const city = [deal.city, deal.state].filter(Boolean).join(', ');
  const cityMsa = [city, deal.msa].filter(Boolean).join(' · ');
  const line2Parts = [cityMsa, deal.asset_class || deal.use_type].filter(Boolean);
  const currentStatus = deal.status || 'new';
  const statusColor = STATUS_COLORS[currentStatus] || 'gray';
  const statusLabel = STATUS_LABELS[currentStatus] || currentStatus;
  const dealContactList = contacts[deal.id] || [];
  const dealNotesList = dealNotes[deal.id] || [];
  const signals = bj.signal_tags || bj.distress_signals || deal.signals || [];

  function signalColor(sig) {
    const raw = typeof sig === 'string' ? sig : (sig.type || sig.category || sig.label || '');
    const t = raw.toLowerCase();
    if (t.includes('tax') || t.includes('lien') || t.includes('delinq') || t.includes('forecl')) return 'red';
    if (t.includes('vacan') || t.includes('code') || t.includes('rising') || t.includes('absentee')) return 'amber';
    return 'green';
  }

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
    setShowStatusDropdown(false);
    await updateStatus(deal.id, newStatus);
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
  const showDistress    = signals.length > 0;
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
    { id: 'dd-distress',    label: 'Distress Signals',show: showDistress },
    { id: 'dd-dealintel',   label: 'Deal Intel',      show: showDealIntel },
    { id: 'dd-portfolio',   label: 'Owner Portfolio', show: showPortfolio },
    { id: 'dd-notes',       label: 'Notes',           show: true },
  ].filter((s) => s.show);

  return (
    <div className="dd-root">
      <SectionNav sections={sectionDefs} />
      <div className="dd-nav-band" />

      <div className="dd-sticky-header">
        <div className="dd-addr-bar">
          <div className="dd-addr-identity">
            <span className="dd-addr-line1">{deal.address || 'Unknown Address'}</span>
            {line2Parts.length > 0 && (
              <span className="dd-addr-line2">{line2Parts.join(' · ')}</span>
            )}
            {onClose && (
              <button className="dd-addr-back" onClick={onClose}>← Back to deals</button>
            )}
          </div>
          <div className="dd-addr-divider" />
          <div className="dd-addr-metrics">
            {metrics.map(m => (
              <div key={m.label} className="dd-addr-metric-cell">
                <span className="dd-addr-metric-label">{m.label}</span>
                <span className="dd-addr-metric-value">{m.value || '—'}</span>
              </div>
            ))}
          </div>
          <div className="dd-addr-divider" />
          <div className="dd-addr-actions">
            <span className={`dd-score-badge ${variant}`}>{scoreLabel}</span>
            <button className="dd-btn primary" onClick={handleMarkHot} disabled={hotLoading}>
              {deal.feedback === 'hot' ? '★ Hot' : '☆ Mark as Hot'}
            </button>
            <button
              className={`dd-btn outline${deal.feedback === 'not_relevant' ? ' active' : ''}`}
              onClick={async () => {
                const isUndo = deal.feedback === 'not_relevant';
                await postFeedback(deal.id, isUndo ? null : 'not_relevant');
                addToast(
                  isUndo ? 'Marked relevant again' : 'Marked as not relevant',
                  isUndo ? 'info' : 'success'
                );
                if (!isUndo && onClose) onClose();
              }}
            >
              {deal.feedback === 'not_relevant' ? '✓ Not Relevant' : 'Not Relevant'}
            </button>
            {onClose && (
              <button className="dd-btn close-btn" onClick={onClose} aria-label="Close">&times;</button>
            )}
          </div>
        </div>

        <div className="dd-substrip">
          <div className="dd-status-chip-wrap" ref={statusRef}>
            <button
              className={`dd-status-chip ${statusColor}`}
              onClick={() => setShowStatusDropdown(p => !p)}
            >
              <span className="dd-status-dot" />
              {statusLabel}
              <span className="dd-status-caret">▾</span>
            </button>
            {showStatusDropdown && (
              <div className="dd-status-dropdown dd-status-dropdown--right">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`dd-status-option ${STATUS_COLORS[s] || 'gray'}${s === currentStatus ? ' active' : ''}`}
                    onClick={() => handleStatusChange(s)}
                  >
                    <span className="dd-status-dot" />
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="dd-contact-btn" onClick={() => setContactModalOpen(true)}>
            <Phone size={13} strokeWidth={2.2} />
            Log Contact
          </button>
        </div>
      </div>

      <div id="dd-brief" className="dd-discovery-panel">
        <div className="dd-discovery-left">
          <span className="dd-discovery-eyebrow">AI Property Brief</span>
          {bj.headline && <p className="dd-headline">{bj.headline}</p>}
          <p className={`dd-discovery-narrative${bj.narrative ? '' : ' dd-discovery-narrative--empty'}`}>
            {bj.narrative || 'No summary narrative available for this property.'}
          </p>
          {(signals.length > 0 || deal.absentee_owner) && (
            <div className="dd-discovery-signals">
              {deal.absentee_owner && (
                <span className="dd-signal-pill amber">Absentee Owner</span>
              )}
              {signals.map((sig, i) => {
                const raw = typeof sig === 'string' ? sig : (sig?.tag || sig?.label || sig?.description || sig?.type);
                const label = (typeof raw === 'string' && raw.trim()) ? raw : null;
                if (!label) return null;
                return (
                  <span key={i} className={`dd-signal-pill ${signalColor(sig)}`}>
                    {label}
                  </span>
                );
              })}
            </div>
          )}
          {bj.next_action && (
            <div className="dd-next-action">
              <span className="dd-next-action-label">Recommended Action</span>
              <span className="dd-next-action-text">{bj.next_action}</span>
            </div>
          )}
        </div>
        <div className="dd-discovery-right">
          <div className="dd-discovery-image">
            <AerialThumb id={deal.id} lat={deal.lat} lng={deal.lng} large={true} showParcel={false} />
          </div>
        </div>
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

            {showDistress && (
            <div id="dd-distress" className="dd-sec dd-card">
              <SecHead title="Distress Signals" date={enriched} />
              <div className="dd-sec-body">
                {signals.length > 0 ? (
                  <table className="dd-table">
                    <thead><tr><th>Signal</th><th>Type</th><th>Severity</th></tr></thead>
                    <tbody>
                      {signals.map((sig, i) => {
                        const color = signalColor(sig);
                        const dotColor = color === 'red' ? 'red' : color === 'amber' ? 'orange' : 'green';
                        const raw = typeof sig === 'string' ? sig : (sig?.tag || sig?.label || sig?.description || sig?.type);
                        const label = (typeof raw === 'string' && raw.trim()) ? raw : null;
                        if (!label) return null;
                        const type = (sig.type || sig.category || '').replace(/_/g, ' ') || 'General';
                        return (
                          <tr key={i}>
                            <td><span className={`dd-signal-dot ${dotColor}`} />{label}</td>
                            <td className="muted" style={{ textTransform: 'capitalize' }}>{type}</td>
                            <td>
                              <Chip color={color === 'red' ? 'red' : color === 'amber' ? 'amber' : 'green'}>
                                {color === 'red' ? 'High' : color === 'amber' ? 'Medium' : 'Low'}
                              </Chip>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <span style={{ color: 'var(--fg-4)', fontSize: 'var(--t-cap)' }}>No distress signals recorded</span>
                )}
                <p className="dd-sec-source">Source: Nightdrop AI · County Lien Records · Tax Assessor</p>
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

          {(deal.lat && deal.lng) && (
            <div className="dd-img-sidebar">
              <div className="dd-img-thumb">
                <AerialThumb id={deal.id} lat={deal.lat} lng={deal.lng} large={true} />
                <span className="dd-img-thumb-label">Satellite</span>
              </div>
              <div className="dd-img-thumb">
                <AerialThumb id={deal.id} lat={deal.lat} lng={deal.lng} showParcel={true} />
                <span className="dd-img-thumb-label">Parcel</span>
              </div>
            </div>
          )}
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

      {deals && deals.length > 1 && onNavigateDeal && (
        <div className="dd-nav-float">
          <button className="dd-deal-nav-btn" onClick={() => onNavigateDeal(deals[dealIndex - 1])} disabled={dealIndex <= 0}>← Prev</button>
          <span className="dd-deal-nav-count">Deal {dealIndex + 1} of {deals.length}</span>
          <button className="dd-deal-nav-btn" onClick={() => onNavigateDeal(deals[dealIndex + 1])} disabled={dealIndex >= deals.length - 1}>Next →</button>
        </div>
      )}

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
