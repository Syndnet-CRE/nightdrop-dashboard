import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { useDeals } from '../contexts/DealsContext.jsx';
import { fmtMoney, hasVal } from '../lib/format.js';
import { getAssetClass, getAssetClassColor } from '../lib/buyBoxTaxonomy.js';
import { OwnerPortfolioTable } from './DealDetail/OwnerPortfolioTable.jsx';

const MIN_RADIUS = 10;
const MAX_RADIUS = 32;
const MAX_NODES = 50;

function makeNodes(portfolio, sourceAddress) {
  const props = (portfolio.properties || []).slice(0, MAX_NODES);
  const maxValue = d3.max(props, (p) => Number(p.assessed_value || p.tax_assessed_total) || 0) || 1;
  const radius = d3.scaleSqrt().domain([0, maxValue]).range([MIN_RADIUS, MAX_RADIUS]).clamp(true);
  const sourceMaxValue = maxValue || 1;
  const nodes = [
    {
      id: 'source',
      label: sourceAddress || 'This Property',
      isSource: true,
      r: MAX_RADIUS + 2,
      color: '#1DAF29',
    },
    ...props.map((p) => ({
      id: String(p.attom_id),
      label: p.address_full || p.address || String(p.attom_id),
      city: p.address_city,
      state: p.address_state,
      matchedBy: p.matched_by,
      dealId: p.deal_id || null,
      assetClass: p.asset_class || p.resolved_asset_type,
      assessedValue: Number(p.assessed_value || p.tax_assessed_total) || 0,
      yearsOwned: p.years_owned,
      distressScore: p.distress_score,
      activeForeclosure: p.active_foreclosure,
      r: radius(Number(p.assessed_value || p.tax_assessed_total) || 0),
      color: getAssetClassColor(p.asset_class || p.resolved_asset_type),
    })),
  ];
  return { nodes, sourceMaxValue };
}

function edgeColor(m) {
  return m === 'name' ? '#3E7BFA' : m === 'address' ? '#F4B73E' : '#1DAF29';
}

function drawGraph(svgEl, nodes, onHover, onLeave, onClick) {
  const props = nodes.slice(1);
  const links = props.map((n) => ({
    source: 'source',
    target: n.id,
    label: n.matchedBy || '',
  }));

  const w = svgEl.getBoundingClientRect().width || 640;
  const h = 320;

  const svg = d3.select(svgEl).attr('viewBox', `0 0 ${w} ${h}`);
  svg.selectAll('*').remove();

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d) => d.id).distance(130))
    .force('charge', d3.forceManyBody().strength(-260))
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('collision', d3.forceCollide((d) => d.r + 6))
    .alphaDecay(0.04);

  const linkSel = svg.append('g').selectAll('line')
    .data(links).join('line')
    .attr('stroke', (d) => edgeColor(d.label))
    .attr('stroke-width', 1.6)
    .attr('stroke-opacity', 0.55);

  const linkLabel = svg.append('g').selectAll('text')
    .data(links).join('text')
    .text((d) => d.label || '')
    .attr('font-size', 10)
    .attr('font-family', "Inter, system-ui, sans-serif")
    .attr('font-feature-settings', "'tnum','zero'")
    .attr('fill', '#9DA2B3')
    .attr('text-anchor', 'middle');

  const nodeG = svg.append('g').selectAll('g')
    .data(nodes).join('g')
    .style('cursor', (d) => (!d.isSource ? 'pointer' : 'default'))
    .on('mouseenter', (event, d) => onHover && onHover(event, d))
    .on('mousemove', (event, d) => onHover && onHover(event, d))
    .on('mouseleave', () => onLeave && onLeave())
    .on('click', (_event, d) => onClick && onClick(d));

  nodeG.append('circle')
    .attr('r', (d) => d.r)
    .attr('fill', (d) => d.color)
    .attr('fill-opacity', (d) => (d.isSource ? 1 : 0.85))
    .attr('stroke', (d) => (d.isSource ? '#0E7A18' : 'rgba(0,0,0,0.18)'))
    .attr('stroke-width', (d) => (d.isSource ? 2.5 : 1.2));

  nodeG.filter((d) => d.isSource).append('text')
    .text('★')
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('font-size', 14).attr('fill', '#fff').attr('font-weight', 'bold');

  sim.on('tick', () => {
    linkSel
      .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
    linkLabel
      .attr('x', (d) => (d.source.x + d.target.x) / 2)
      .attr('y', (d) => (d.source.y + d.target.y) / 2 - 4);
    nodeG.attr('transform', (d) => `translate(${d.x},${d.y})`);
  });

  sim.on('end', () => sim.stop());
  return sim;
}

function NodeTooltip({ tooltip }) {
  if (!tooltip) return null;
  const { x, y, node } = tooltip;
  return (
    <div
      className="dd-portfolio-tooltip"
      style={{ left: x, top: y }}
      role="tooltip"
    >
      <div className="dd-portfolio-tooltip-title">
        {node.isSource ? node.label : (node.label || '—')}
      </div>
      {!node.isSource && node.city && node.state && (
        <div className="dd-portfolio-tooltip-sub">{node.city}, {node.state}</div>
      )}
      {!node.isSource && (
        <div className="dd-portfolio-tooltip-grid">
          {node.assetClass && (
            <>
              <span>Asset</span>
              <strong>{getAssetClass(node.assetClass)?.label || node.assetClass}</strong>
            </>
          )}
          {hasVal(node.assessedValue) && node.assessedValue > 0 && (
            <>
              <span>Assessed</span>
              <strong>{fmtMoney(node.assessedValue)}</strong>
            </>
          )}
          {hasVal(node.yearsOwned) && (
            <>
              <span>Held</span>
              <strong>{node.yearsOwned} yrs</strong>
            </>
          )}
          {hasVal(node.distressScore) && (
            <>
              <span>Distress</span>
              <strong>{Math.round(node.distressScore)}</strong>
            </>
          )}
          {node.matchedBy && (
            <>
              <span>Match</span>
              <strong style={{ color: edgeColor(node.matchedBy) }}>{node.matchedBy}</strong>
            </>
          )}
        </div>
      )}
      <div className="dd-portfolio-tooltip-foot">
        {node.isSource ? 'Current property' : (node.dealId ? 'Click to view on map' : 'Not in your feed')}
      </div>
    </div>
  );
}

export function OwnerPortfolio({ deal }) {
  const { portfolios, fetchOwnerPortfolio } = useDeals();
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const attomId = deal.attomId || deal.attom_id;
  const portfolio = portfolios[attomId];

  useEffect(() => {
    if (attomId) fetchOwnerPortfolio(attomId);
  }, [attomId, fetchOwnerPortfolio]);

  useEffect(() => {
    if (!portfolio || !portfolio.properties?.length || !svgRef.current) return;
    const { nodes } = makeNodes(portfolio, deal.address);
    const sim = drawGraph(
      svgRef.current,
      nodes,
      (event, node) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip({
          x: event.clientX - rect.left + 12,
          y: event.clientY - rect.top + 12,
          node,
        });
      },
      () => setTooltip(null),
      (node) => {
        if (node.isSource) return;
        if (node.dealId) navigate(`/map?focus=${encodeURIComponent(node.dealId)}`);
      }
    );
    return () => sim && sim.stop();
  }, [portfolio, deal.address, navigate]);

  if (!attomId) return null;
  if (portfolio === undefined) return <p className="dd-portfolio-loading">Loading owner portfolio…</p>;
  if (!portfolio) return <p className="dd-portfolio-empty">Portfolio data unavailable for this owner.</p>;

  const props = portfolio.properties || [];
  const totals = portfolio.totals || {};
  const classes = Array.from(new Set(props.map((p) => p.asset_class || p.resolved_asset_type).filter(Boolean)));

  return (
    <div className="dd-portfolio-root" ref={containerRef}>
      <div className="dd-portfolio-header">
        <span className="dd-portfolio-owner">{deal.owner_name || portfolio.owner_vectors?.owner_name || '—'}</span>
        {totals.property_count > 0 && (
          <span className="dd-portfolio-count">
            {totals.property_count} linked propert{totals.property_count === 1 ? 'y' : 'ies'}
            {totals.total_assessed_value ? ` · ${fmtMoney(totals.total_assessed_value)} aggregate` : ''}
          </span>
        )}
      </div>

      {props.length > 0 ? (
        <>
          <svg
            ref={svgRef}
            className="dd-portfolio-graph"
            style={{ width: '100%', height: 320, display: 'block' }}
            role="img"
            aria-label="Owner portfolio force graph"
          />
          <NodeTooltip tooltip={tooltip} />
          <div className="dd-portfolio-legend">
            <span className="dd-portfolio-legend-group">
              <span className="dd-portfolio-legend-hdr">Edge:</span>
              <span className="dd-portfolio-legend-item"><span style={{ background: '#3E7BFA' }} className="dd-portfolio-legend-swatch" />Name</span>
              <span className="dd-portfolio-legend-item"><span style={{ background: '#F4B73E' }} className="dd-portfolio-legend-swatch" />Address</span>
              <span className="dd-portfolio-legend-item"><span style={{ background: '#1DAF29' }} className="dd-portfolio-legend-swatch" />Both</span>
            </span>
            {classes.length > 0 && (
              <span className="dd-portfolio-legend-group">
                <span className="dd-portfolio-legend-hdr">Class:</span>
                {classes.map((c) => (
                  <span key={c} className="dd-portfolio-legend-item">
                    <span style={{ background: getAssetClassColor(c) }} className="dd-portfolio-legend-swatch" />
                    {getAssetClass(c)?.label || c.replace(/_/g, ' ')}
                  </span>
                ))}
              </span>
            )}
          </div>
          {props.length >= MAX_NODES && (
            <p className="dd-portfolio-cap-note">
              Showing top {MAX_NODES} of {totals.property_count} properties · see table below for the rest.
            </p>
          )}
          <OwnerPortfolioTable portfolio={portfolio} />
        </>
      ) : (
        <p className="dd-portfolio-empty">No other linked properties found for this owner.</p>
      )}
    </div>
  );
}
