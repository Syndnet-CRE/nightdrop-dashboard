import { useState, useEffect, useRef } from 'react';
import { useDeals } from '../../contexts/DealsContext';
import { getAssetClassColor } from '../../lib/buyBoxTaxonomy';
import { ownerEntityBadge } from './ownerGraph.helpers.js';

function fmt(n) { return '$' + (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : (n / 1e3).toFixed(0) + 'K'); }
function fmtSF(n) { return n.toLocaleString() + ' SF'; }

function getAssetClassLabel(slug) {
  const labels = {
    self_storage: 'Self Storage',
    multifamily: 'Multifamily',
    mobile_home_rv: 'Mobile Home / RV',
    residential_sfr: 'Single Family',
    land: 'Land',
    industrial: 'Industrial',
    retail: 'Retail',
    gas_station_c_store: 'Gas Station',
    office: 'Office',
    special_purpose: 'Special Purpose',
  };
  return labels[slug] || (slug ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, ' ') : slug);
}

function PortfolioGraph({ onSelect, selected, portfolio, deal }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const animRef = useRef(null);
  const nodesRef = useRef(null);
  const viewRef = useRef({ scale: 1, ox: 0, oy: 0 });
  const interactRef = useRef({
    mode: 'idle',
    dragNode: null,
    startMx: 0, startMy: 0,
    startOx: 0, startOy: 0,
    startNodeX: 0, startNodeY: 0
  });
  const [hovered, setHovered] = useState(null);
  const [, forceRerender] = useState(0);
  const [customView, setCustomView] = useState(false);

  const screenToWorld = (sx, sy) => {
    const v = viewRef.current;
    return { x: (sx - v.ox) / v.scale, y: (sy - v.oy) / v.scale };
  };

  const resetView = () => {
    viewRef.current = { scale: 1, ox: 0, oy: 0 };
    setCustomView(false);
    forceRerender(n => n + 1);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !portfolio?.properties?.length) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const propNodes = portfolio.properties.map((p, i) => {
      const angle = i / portfolio.properties.length * Math.PI * 2;
      const dist = 100 + Math.random() * 60;
      const typeLabel = getAssetClassLabel(p.asset_class || 'unknown');
      const addressDisplay = (p.address_full || p.address || 'Unknown').split(' ').slice(0, 3).join(' ');
      return {
        id: p.attom_id,
        label: addressDisplay,
        sub: typeLabel,
        x: W / 2 + Math.cos(angle) * dist,
        y: H / 2 + Math.sin(angle) * dist,
        r: 8 + (p.assessed_value || 0) / 2000000,
        type: p.asset_class,
        current: p.attom_id === deal.attomId,
        status: p.active_foreclosure ? 'mortgaged' : (p.ltv > 50 ? 'mortgaged' : 'free-clear'),
        vx: 0, vy: 0,
        pinned: false,
        prop: p
      };
    });

    const ownerName = portfolio.owner_vectors?.name || deal.owner_name || 'Owner';
    const ownerNode = {
      id: 'owner',
      label: ownerName,
      sub: 'Owner Entity',
      entityBadge: ownerEntityBadge(deal),
      x: W / 2, y: H / 2,
      r: 22,
      type: 'owner',
      vx: 0, vy: 0,
      pinned: false
    };

    const nodes = [ownerNode, ...propNodes];
    nodesRef.current = nodes;
    const edges = propNodes.map(n => ({ from: 'owner', to: n.id }));

    function tick() {
      const alpha = 0.15;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minD = (a.r + b.r) * 4;
          if (dist < minD) {
            const f = (minD - dist) / dist * alpha * 0.5;
            if (!a.pinned) { a.vx -= dx * f; a.vy -= dy * f; }
            if (!b.pinned) { b.vx += dx * f; b.vy += dy * f; }
          }
        }
      }
      propNodes.forEach(n => {
        const dx = ownerNode.x - n.x, dy = ownerNode.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = 130 + n.r * 2;
        const f = (dist - target) / dist * alpha * 0.3;
        if (!n.pinned) { n.vx += dx * f; n.vy += dy * f; }
        if (!ownerNode.pinned) { ownerNode.vx -= dx * f * 0.02; ownerNode.vy -= dy * f * 0.02; }
      });
      nodes.forEach(n => {
        if (n.pinned) return;
        n.vx += (W / 2 - n.x) * 0.002;
        n.vy += (H / 2 - n.y) * 0.002;
      });
      nodes.forEach(n => {
        if (n.pinned) { n.vx = 0; n.vy = 0; return; }
        n.vx *= 0.88; n.vy *= 0.88;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(n.r + 8, Math.min(W - n.r - 8, n.x));
        n.y = Math.max(n.r + 8, Math.min(H - n.r - 8, n.y));
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      const cs = getComputedStyle(canvas);
      const fgColor = cs.getPropertyValue('--fg').trim() || '#e5e5e5';
      const mutedColor = cs.getPropertyValue('--muted-foreground').trim() || '#a3a3a3';
      const accentColor = cs.getPropertyValue('--accent').trim() || '#2da200';
      const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'light';
      const edgeBase = isDark ? 'rgba(255,255,255,' : 'rgba(0,0,0,';

      const v = viewRef.current;
      ctx.save();
      ctx.translate(v.ox, v.oy);
      ctx.scale(v.scale, v.scale);

      edges.forEach(e => {
        const a = nodes.find(n => n.id === 'owner'), b = nodes.find(n => n.id === e.to);
        if (!a || !b) return;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = b.current ? accentColor + '55' : edgeBase + '0.10)';
        ctx.lineWidth = (b.current ? 1.5 : 0.9) / v.scale;
        ctx.stroke();
      });

      nodes.forEach(n => {
        if (n.type === 'owner') {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fillStyle = accentColor;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = accentColor + '30';
          ctx.lineWidth = 1.5 / v.scale;
          ctx.stroke();
          ctx.fillStyle = isDark ? '#0a0a0a' : '#ffffff';
          ctx.font = '700 9px "DM Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(n.entityBadge || 'OWN', n.x, n.y);
          ctx.fillStyle = fgColor;
          ctx.font = '600 10px "DM Sans", sans-serif';
          ctx.textBaseline = 'top';
          ctx.fillText(n.label, n.x, n.y + n.r + 6);
        } else {
          const color = getAssetClassColor(n.type) || mutedColor;
          const isSel = selected === n.id;
          const isHov = hovered === n.id;
          const showLabel = isSel || isHov || n.r > 7;

          if (isSel || n.current) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r + 6, 0, Math.PI * 2);
            ctx.fillStyle = (isSel ? color : accentColor) + '22';
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fillStyle = isSel ? color : n.current ? color + 'DD' : color + '70';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.strokeStyle = isSel ? color : isHov ? color + '99' : color + '44';
          ctx.lineWidth = (isSel ? 2 : 1) / v.scale;
          ctx.stroke();

          if (showLabel) {
            const labelColor = isSel ? fgColor : isHov ? fgColor : mutedColor;
            ctx.fillStyle = labelColor;
            ctx.font = (isSel || isHov ? '600' : '500') + ' 10px "DM Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const maxW = 110;
            let label = n.label;
            while (ctx.measureText(label).width > maxW && label.length > 6) label = label.slice(0, -1);
            if (label !== n.label) label = label.slice(0, -1) + '…';
            ctx.fillText(label, n.x, n.y + n.r + 4);
            if (isSel || isHov) {
              ctx.fillStyle = mutedColor;
              ctx.font = '400 9px "DM Sans", sans-serif';
              ctx.fillText(n.sub, n.x, n.y + n.r + 17);
            }
          }
        }
      });

      ctx.restore();
    }

    let frame = 0;
    function loop() {
      if (frame < 180) tick();
      frame++;
      draw();
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    const getMouse = e => {
      const rect = canvas.getBoundingClientRect();
      return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    };

    const hitTest = (sx, sy) => {
      const w = screenToWorld(sx, sy);
      return nodesRef.current && nodesRef.current.find(
        n => n.type !== 'owner' && Math.hypot(n.x - w.x, n.y - w.y) < n.r + 6 / viewRef.current.scale
      );
    };

    const handleMove = e => {
      const m = getMouse(e);
      const it = interactRef.current;

      if (it.mode === 'panning') {
        const v = viewRef.current;
        v.ox = it.startOx + (m.sx - it.startMx);
        v.oy = it.startOy + (m.sy - it.startMy);
        return;
      }
      if (it.mode === 'dragging' && it.dragNode) {
        const w = screenToWorld(m.sx, m.sy);
        const w0 = screenToWorld(it.startMx, it.startMy);
        it.dragNode.x = it.startNodeX + (w.x - w0.x);
        it.dragNode.y = it.startNodeY + (w.y - w0.y);
        it.dragNode.vx = 0; it.dragNode.vy = 0;
        return;
      }
      const hit = hitTest(m.sx, m.sy);
      setHovered(hit ? hit.id : null);
      canvas.style.cursor = hit ? 'grab' : 'default';
    };

    const handleDown = e => {
      if (e.button !== 0) return;
      const m = getMouse(e);
      const hit = hitTest(m.sx, m.sy);
      const it = interactRef.current;
      it.startMx = m.sx; it.startMy = m.sy;
      if (hit) {
        it.mode = 'dragging';
        it.dragNode = hit;
        hit.pinned = true;
        it.startNodeX = hit.x; it.startNodeY = hit.y;
        canvas.style.cursor = 'grabbing';
      } else {
        it.mode = 'panning';
        const v = viewRef.current;
        it.startOx = v.ox; it.startOy = v.oy;
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleUp = e => {
      const it = interactRef.current;
      const m = getMouse(e);
      const moved = Math.hypot(m.sx - it.startMx, m.sy - it.startMy) > 3;
      if (it.mode === 'dragging' && it.dragNode) {
        if (!moved) {
          const nid = it.dragNode.id;
          onSelect(nid === selected ? null : nid);
        }
        it.dragNode = null;
      }
      it.mode = 'idle';
      const hit = hitTest(m.sx, m.sy);
      canvas.style.cursor = hit ? 'grab' : 'default';
    };

    const handleLeave = () => {
      const it = interactRef.current;
      if (it.mode === 'dragging' && it.dragNode) it.dragNode = null;
      it.mode = 'idle';
      setHovered(null);
    };

    const handleWheel = e => {
      e.preventDefault();
      const m = getMouse(e);
      const v = viewRef.current;
      const worldBefore = screenToWorld(m.sx, m.sy);
      const dz = -e.deltaY * 0.0015;
      const next = Math.max(0.25, Math.min(4, v.scale * (1 + dz)));
      v.scale = next;
      v.ox = m.sx - worldBefore.x * v.scale;
      v.oy = m.sy - worldBefore.y * v.scale;
      setCustomView(v.scale !== 1 || v.ox !== 0 || v.oy !== 0);
      forceRerender(n => n + 1);
    };

    const handleDblClick = e => {
      const m = getMouse(e);
      const hit = hitTest(m.sx, m.sy);
      if (!hit) {
        viewRef.current = { scale: 1, ox: 0, oy: 0 };
        setCustomView(false);
        forceRerender(n => n + 1);
      }
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleLeave);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDblClick);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('mouseleave', handleLeave);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('dblclick', handleDblClick);
    };
  }, [selected, hovered, onSelect, portfolio, deal]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg-sunken)' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {customView && (
        <button
          aria-label="Reset view to default zoom and position"
          onClick={resetView}
          style={{
            position: 'absolute', top: 10, right: 10,
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600,
            color: 'var(--fg-muted)',
            background: 'var(--btn-rest)',
            border: '1px solid var(--btn-border)',
            borderRadius: 5, padding: '4px 9px', cursor: 'pointer',
            transition: 'background-color var(--t-fast) var(--ease-fast), border-color var(--t-fast) var(--ease-fast), color var(--t-fast) var(--ease-fast)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--fg)'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--btn-border)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
          title="Reset view (or double-click empty space)">
          Reset view
        </button>
      )}
    </div>
  );
}

export function DealOwnerGraph({ deal }) {
  const [selected, setSelected] = useState(null);
  const { fetchOwnerPortfolio, portfolios } = useDeals();
  const portfolio = portfolios[String(deal.attomId)] || null;

  useEffect(() => {
    if (deal.attomId) fetchOwnerPortfolio(deal.attomId);
  }, [deal.attomId, fetchOwnerPortfolio]);

  const selProp = portfolio?.properties?.find(p => p.attom_id === selected);
  const totals = portfolio?.totals || { property_count: 0, total_assessed_value: 0, total_building_sf: 0, total_acreage: 0 };

  if (portfolio === null) {
    return (
      <section style={{ margin: '0 24px', marginTop: 16 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--card-shadow)', height: '508px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>Owner Portfolio Graph</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontFamily: 'var(--font-ui)', fontSize: 13, padding: 24, textAlign: 'center' }}>
            No portfolio data available for this owner.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ margin: '0 24px', marginTop: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

        <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--card-shadow)', height: '508px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>Owner Portfolio Graph</span>
            <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 11, color: 'var(--muted-foreground)', fontFeatureSettings: "'tnum','zero'" }}>{portfolio.properties?.length || 0} properties · {fmt(totals.total_assessed_value || 0)} total</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
              {portfolio.totals?.property_count_by_asset_class && Object.entries(portfolio.totals.property_count_by_asset_class).map(([slug]) => {
                const color = getAssetClassColor(slug);
                const label = getAssetClassLabel(slug);
                return (
                  <div key={slug} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 500, color: 'var(--muted-foreground)' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <PortfolioGraph onSelect={setSelected} selected={selected} portfolio={portfolio} deal={deal} />
            {selProp &&
            <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', minWidth: 180 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>{selProp.address_full}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', marginBottom: 6 }}>{selProp.address_city} · {getAssetClassLabel(selProp.asset_class)}</div>
                {[['Value', fmt(selProp.assessed_value)], ['GBA', fmtSF(selProp.building_sf || 0)], ['Acres', (selProp.lot_acreage || 0).toFixed(1) + ' ac'], ['Status', selProp.active_foreclosure || selProp.ltv > 50 ? 'mortgaged' : 'free-clear']].map(([l, v]) =>
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border-faint)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-dim)' }}>{l}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: l === 'Status' && v === 'mortgaged' ? 'var(--warn)' : 'var(--fg)' }}>{v}</span>
                  </div>
              )}
              </div>
            }
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Portfolio Summary</div>
            {[
            ['Properties', totals.property_count],
            ['Total Value', fmt(totals.total_assessed_value)],
            ['Total SF', (totals.total_building_sf || 0).toLocaleString()],
            ['Total Acres', (totals.total_acreage || 0).toFixed(1) + ' ac'],
            ].map(([l, v]) =>
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid var(--border-faint)' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--muted-foreground)' }}>{l}</span>
                <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 12, fontWeight: 700, color: 'var(--fg)', fontFeatureSettings: "'tnum','zero'" }}>{v}</span>
              </div>
            )}
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Asset Mix</div>
            {portfolio.totals?.property_count_by_asset_class && Object.entries(portfolio.totals.property_count_by_asset_class).map(([slug, count]) => {
              const color = getAssetClassColor(slug);
              const label = getAssetClassLabel(slug);
              const pct = Math.round(count / (totals.property_count || 1) * 100);
              return (
                <div key={slug} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block', flexShrink: 0 }} />
                      {label}
                    </span>
                    <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', fontFeatureSettings: "'tnum','zero'" }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--secondary)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>All Portfolio Properties</span>
          <span style={{ fontFamily: 'var(--font-secondary)', fontSize: 11, color: 'var(--muted-foreground)', fontFeatureSettings: "'tnum','zero'" }}>{portfolio.properties?.length || 0} assets</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 90px 90px 80px 110px 110px', gap: 0, padding: '8px 18px 8px', borderBottom: '2px solid var(--border)', background: 'var(--secondary)' }}>
          {['Address', 'City / Market', 'Type', 'GBA', 'Acres', 'Est. Value', 'Status'].map(h =>
          <div key={h} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingRight: 8 }}>{h}</div>
          )}
        </div>
        {portfolio.properties?.map((p) => {
          const color = getAssetClassColor(p.asset_class);
          const isCur = p.attom_id === deal.attomId;
          const isSel = selected === p.attom_id;
          return (
            <div key={p.attom_id}
            onClick={() => setSelected(isSel ? null : p.attom_id)}
            onMouseOver={(e) => e.currentTarget.style.background = isCur ? 'var(--accent-tint)' : isSel ? 'var(--secondary)' : 'var(--secondary)'}
            onMouseOut={(e) => e.currentTarget.style.background = isCur ? 'var(--accent-tint)' : isSel ? 'var(--secondary)' : 'transparent'}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 90px 90px 80px 110px 110px', gap: 0, padding: '11px 18px', cursor: 'pointer', background: isCur ? 'var(--accent-tint)' : isSel ? 'var(--secondary)' : 'transparent', borderBottom: '1px solid var(--border-faint)', transition: 'background-color 0.12s', alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: isCur ? 700 : 500, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 7, paddingRight: 8 }}>
                {isCur && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'block', flexShrink: 0 }} />}
                {p.address_full}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--muted-foreground)', paddingRight: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.address_city}, {p.address_state}</div>
              <div style={{ display: 'inline-flex' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, color, background: color + '18', border: `1px solid ${color}30`, borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>{getAssetClassLabel(p.asset_class)}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 12, fontWeight: 600, color: 'var(--fg)', textAlign: 'right', paddingRight: 8, fontFeatureSettings: "'tnum','zero'" }}>{(p.building_sf || 0).toLocaleString()}</div>
              <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 12, fontWeight: 600, color: 'var(--fg)', textAlign: 'right', paddingRight: 8, fontFeatureSettings: "'tnum','zero'" }}>{(p.lot_acreage || 0).toFixed(1)}</div>
              <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 13, fontWeight: 700, color: 'var(--fg)', textAlign: 'right', paddingRight: 8, fontFeatureSettings: "'tnum','zero'" }}>{fmt(p.assessed_value)}</div>
              <div>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, color: p.active_foreclosure || p.ltv > 50 ? 'var(--warning)' : 'var(--accent)', background: (p.active_foreclosure || p.ltv > 50 ? 'var(--warn-tint)' : 'var(--accent-tint)'), border: `1px solid ${p.active_foreclosure || p.ltv > 50 ? 'var(--warning)' : 'var(--accent)'}`, borderRadius: 5, padding: '3px 8px', whiteSpace: 'nowrap' }}>
                  {p.active_foreclosure || p.ltv > 50 ? 'Mortgaged' : 'Free & Clear'}
                </span>
              </div>
            </div>
          );
        })}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 90px 90px 80px 110px 110px', gap: 0, padding: '11px 18px', background: 'var(--secondary)', borderTop: '2px solid var(--border)', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, color: 'var(--fg)', letterSpacing: '0.02em' }}>Portfolio Totals</div>
          <div />
          <div />
          <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 13, fontWeight: 700, color: 'var(--fg)', textAlign: 'right', paddingRight: 8, fontFeatureSettings: "'tnum','zero'" }}>{(totals.total_building_sf || 0).toLocaleString()}</div>
          <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 13, fontWeight: 700, color: 'var(--fg)', textAlign: 'right', paddingRight: 8, fontFeatureSettings: "'tnum','zero'" }}>{(totals.total_acreage || 0).toFixed(1)}</div>
          <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 14, fontWeight: 800, color: 'var(--accent)', textAlign: 'right', paddingRight: 8, fontFeatureSettings: "'tnum','zero'" }}>{fmt(totals.total_assessed_value)}</div>
          <div />
        </div>
      </div>
    </section>
  );
}
