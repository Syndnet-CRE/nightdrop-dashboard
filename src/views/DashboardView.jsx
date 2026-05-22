import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Star, Flame, Mail, Inbox } from 'lucide-react';
import { useDeals } from '../contexts/DealsContext';
import FeedDealCard from '../components/feed/FeedDealCard';
import ChatFab from '../components/feed/ChatFab';
import RightRail from '../components/RightRail';
import FeedToolbar from '../components/feed/FeedToolbar';
import WeekDayTabs from '../components/feed/WeekDayTabs';

const SCROLL_KEY = 'nightdrop-feed-scroll';
const SORT_KEY   = 'nightdrop-feed-sort';

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWithinLastWeek(deal) {
  const ts = deal.sentAt || deal.created_at;
  if (!ts) return false;
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= Date.now() - 7 * 24 * 60 * 60 * 1000;
}

const SIGNAL_WEIGHT = { red: 3, amber: 2, green: 1 };

function signalScore(deal) {
  const bj = deal.briefJson || deal.brief_json || {};
  const list = bj.signal_tags || deal.signals || [];
  let total = 0;
  for (const s of list) {
    const raw = (typeof s === 'string' ? s : (s.type || s.category || s.label || '')).toLowerCase();
    if (raw.includes('tax') || raw.includes('lien') || raw.includes('delinq') || raw.includes('forecl')) {
      total += SIGNAL_WEIGHT.red;
    } else if (raw.includes('vacan') || raw.includes('code') || raw.includes('rising') || raw.includes('absentee')) {
      total += SIGNAL_WEIGHT.amber;
    } else {
      total += SIGNAL_WEIGHT.green;
    }
  }
  return total;
}

function loadSort() {
  try {
    const v = sessionStorage.getItem(SORT_KEY);
    return v || 'recency';
  } catch { return 'recency'; }
}

export function DashboardView({ searchQuery, filter = 'all', setFilter = () => {} }) {
  const { deals, loading } = useDeals();
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [sort, setSortState] = useState(loadSort);
  const scrollRef = useRef(null);

  const setSort = useCallback((next) => {
    setSortState(next);
    try { sessionStorage.setItem(SORT_KEY, next); } catch { /* storage disabled */ }
  }, []);

  const filteredDeals = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    const list = deals
      .filter(d => !hiddenIds.has(d.id))
      .filter(d => {
        if (filter === 'unread') return !d.is_read;
        if (filter === 'saved')  return !!d.saved;
        if (filter === 'hot')    return d.feedback === 'hot' || (d.score || d.match_score || 0) >= 8;
        if (filter === 'new_this_week') return isWithinLastWeek(d);
        return true;
      })
      .filter(d => {
        if (!q) return true;
        const addr = (d.addr || d.address || '').toLowerCase();
        const asset = (d.asset_class || d.asset || '').toLowerCase();
        return addr.includes(q) || asset.includes(q);
      })
      .filter(d => {
        if (!selectedDay) return true;
        if (!d.sentAt) return false;
        return sameDay(new Date(d.sentAt), selectedDay);
      });

    const sorted = [...list];
    if (sort === 'score') {
      sorted.sort((a, b) => (b.score || b.match_score || 0) - (a.score || a.match_score || 0));
    } else if (sort === 'value') {
      sorted.sort((a, b) => (b.assessed_value || 0) - (a.assessed_value || 0));
    } else if (sort === 'distress') {
      sorted.sort((a, b) => signalScore(b) - signalScore(a));
    } else {
      sorted.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));
    }
    return sorted;
  }, [deals, hiddenIds, searchQuery, filter, selectedDay, sort]);

  function handleHide(id) {
    setHiddenIds(prev => new Set([...prev, id]));
  }

  const counts = useMemo(() => ({
    all:    deals.filter(d => !hiddenIds.has(d.id)).length,
    unread: deals.filter(d => !hiddenIds.has(d.id) && !d.is_read).length,
    saved:  deals.filter(d => !hiddenIds.has(d.id) && d.saved).length,
    hot:    deals.filter(d => !hiddenIds.has(d.id) && (d.feedback === 'hot' || (d.score || d.match_score || 0) >= 8)).length,
  }), [deals, hiddenIds]);

  // Persist scroll position to sessionStorage so navigating to /deal/:id
  // and back restores the user's place in the feed.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        try { sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop)); } catch { /* ignore */ }
      });
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const el = scrollRef.current;
    if (!el) return;
    let saved;
    try { saved = sessionStorage.getItem(SCROLL_KEY); } catch { saved = null; }
    if (saved == null) return;
    const top = Number(saved);
    if (!Number.isFinite(top) || top <= 0) return;
    // Two-tier restore: synchronous attempt covers cached renders; a
    // delayed retry covers async card-image layout shifts pushing the
    // scrollable height up after first paint.
    el.scrollTop = top;
    const id = setTimeout(() => {
      if (Math.abs(el.scrollTop - top) > 4) el.scrollTop = top;
    }, 120);
    return () => clearTimeout(id);
  }, [loading]);

  const handleNavigateAway = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    try { sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop)); } catch { /* ignore */ }
  }, []);

  return (
    <div className="feed-layout">
      <div className="feed-scroll-area">
        <div className="feed-content-row">
          <div className="feed-center-col" ref={scrollRef}>
            <WeekDayTabs
              deals={deals}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
            <FeedToolbar
              filter={filter}
              setFilter={setFilter}
              counts={counts}
              sort={sort}
              setSort={setSort}
            />
            <div className="feed-center" id="feed-scroll">
              {loading ? (
                <div className="feed-loading">Loading your deals…</div>
              ) : (
                <>
                  {filteredDeals.length === 0 && (
                    <div className="feed-empty-state">
                      <div className="feed-empty-icon">
                        {filter === 'saved' ? <Star size={28} /> :
                         filter === 'hot'   ? <Flame size={28} /> :
                         filter === 'unread'? <Mail size={28} /> :
                                              <Inbox size={28} />}
                      </div>
                      <div className="feed-empty-title">
                        {searchQuery
                          ? 'No deals match your search'
                          : filter === 'saved' ? 'No saved deals yet'
                          : filter === 'hot'   ? 'Nothing scorching tonight'
                          : filter === 'unread'? "You're all caught up"
                          : 'No deals yet'}
                      </div>
                      <div className="feed-empty-sub">
                        {searchQuery
                          ? 'Try a different address or asset class.'
                          : filter === 'saved' ? 'Tap the star on any deal to save it here.'
                          : filter === 'hot'   ? 'Hot deals score 8+ or get a thumbs up.'
                          : filter === 'unread'? 'New deals will appear here after tonight’s 2 AM run.'
                          : 'Your first batch arrives at 2 AM CT. Set up a buy box if you haven’t already.'}
                      </div>
                    </div>
                  )}

                  {filteredDeals.map(deal => (
                    <FeedDealCard
                      key={deal.id}
                      deal={deal}
                      onHide={handleHide}
                      onNavigateAway={handleNavigateAway}
                    />
                  ))}
                </>
              )}
            </div>

          </div>

          <RightRail
            deals={filteredDeals}
            selectedDealId={selectedDealId}
            onSelectDeal={id => setSelectedDealId(id === selectedDealId ? null : id)}
          />
        </div>
      </div>

      <ChatFab activeDealId={selectedDealId} />
    </div>
  );
}
