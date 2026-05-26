import { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useMatch, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useDeals, DealsProvider } from './contexts/DealsContext';
import { ToastProvider } from './contexts/ToastContext';
import { ReadStateProvider } from './contexts/ReadStateContext';
import { DealStateProvider } from './contexts/DealStateContext';
import TopHeader from './components/TopHeader';
import LeftPanel from './components/LeftPanel';
import { DealDetail } from './components/DealDetail';
import { ConfirmModal } from './components/ConfirmModal';
import BuyBoxPage from './pages/BuyBoxPage';
import { BuyBoxesView } from './views/BuyBoxesView';
import { MapView } from './views/MapView';
import { SettingsView } from './views/SettingsView';
import { InviteView } from './views/InviteView';
import { AdminView } from './views/AdminView';
import { AccountsView } from './views/AccountsView';
import { LoginView } from './views/LoginView';
import { ForgotPasswordView } from './views/ForgotPasswordView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { InviteClaimView } from './views/InviteClaimView';
import { api } from './lib/api';
import { useToast } from './contexts/ToastContext';

const DealFeedExcelView = lazy(() => import('./views/DealFeedExcelView'));

function ExcelFeedFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--ink-3)',
      fontSize: '13px',
    }}>
      Loading deal feed…
    </div>
  );
}

(() => {
  const t = localStorage.getItem('nightdrop-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
})();

function DealDetailPage({ dealId }) {
  const { deals, loading } = useDeals();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') navigate(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  if (loading) return null;
  const deal = deals.find(d => String(d.id) === dealId);
  if (!deal) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--muted-foreground)', fontSize: 14 }}>
      <span>Deal not found.</span>
      <button className="btn sm" onClick={() => navigate(-1)}>Go back</button>
    </div>
  );

  const dealIndex = deals.findIndex(d => String(d.id) === dealId);

  return (
    <div className="dd-page-glass">
      <DealDetail
        deal={deal}
        onClose={() => navigate(-1)}
        deals={deals}
        dealIndex={dealIndex}
        onNavigateDeal={(d) => navigate('/deal/' + d.id)}
      />
    </div>
  );
}

function DealDetailModal({ dealId }) {
  const { deals, loading } = useDeals();
  const navigate = useNavigate();
  const location = useLocation();

  const close = useCallback(() => {
    navigate(location.key === 'default' ? '/' : -1);
  }, [navigate, location.key]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (loading) return null;
  const deal = deals.find(d => String(d.id) === dealId);
  if (!deal) return null;

  return (
    <div className="deal-modal-overlay">
      <DealDetail deal={deal} onClose={close}/>
    </div>
  );
}

function PauseBoxConfirm({ buyBox, onClose }) {
  const { patchBuyBox } = useDeals();
  return (
    <ConfirmModal
      kind="pause-box"
      onClose={onClose}
      onConfirm={async () => { await patchBuyBox(buyBox.id, { status: 'paused' }); }}
    />
  );
}

// One-shot landing gate: after first buy-box load, redirect users with zero
// buy boxes to the wizard. Only fires on landing paths so explicit deep links
// (deal detail, settings, the wizard itself) are left alone.
const LANDING_PATHS = new Set(['/map', '/dashboard']);

function InitialRouteGate() {
  const { buyBoxes, loading, error } = useDeals();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    if (loading || error) return;
    if (!LANDING_PATHS.has(location.pathname)) return;
    hasRunRef.current = true;
    if (buyBoxes.length === 0) {
      navigate('/buy-boxes/new', { replace: true });
    }
  }, [buyBoxes, loading, error, location.pathname, navigate]);

  return null;
}


function AppShell() {
  const addToast = useToast();
  const { subscriber, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dealMatch = useMatch('/deal/:dealId');
  const onboardingMatch = useMatch('/onboarding');
  const [view, setView] = useState('map');
  const [confirmDanger, setConfirmDanger] = useState(null);
  const [pausingBuyBox, setPausingBuyBox] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [feedFilter, setFeedFilter] = useState('all');

  const isOnDeal = !!dealMatch;

  useEffect(() => {
    if (onboardingMatch) {
      navigate('/buy-boxes/new', { replace: true });
    }
  }, [onboardingMatch, navigate]);
  const isModal  = isOnDeal && !!location.state?.fromMap;
  const noScroll = view === 'map';

  const handleSetView = useCallback((v) => {
    setView(v);
    if (isOnDeal) navigate('/');
  }, [isOnDeal, navigate]);

  const handleOpenDeal = useCallback((deal) => {
    const state = view === 'map' ? { fromMap: true } : undefined;
    navigate('/deal/' + deal.id, state ? { state } : {});
  }, [navigate, view]);

  useEffect(() => {
    if (!loading && !subscriber) {
      try {
        const search = location.search || '';
        sessionStorage.setItem('nd_return_url', location.pathname + search);
      } catch { /* storage disabled */ }
      navigate('/login');
    }
  }, [subscriber, loading, navigate, location.pathname, location.search]);

  // Normalize URL: if subscriber is loaded and we're at the bare "/" or "/login",
  // push to "/map" so the URL bar reflects the default post-onboarding view.
  useEffect(() => {
    if (loading || !subscriber) return;
    if (location.pathname === '/' || location.pathname === '/login') {
      let returnTo;
      try {
        returnTo = sessionStorage.getItem('nd_return_url');
        sessionStorage.removeItem('nd_return_url');
      } catch { /* ignore */ }
      navigate(returnTo && returnTo !== '/login' ? returnTo : '/map', { replace: true });
    }
  }, [loading, subscriber, location.pathname, navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setConfirmDanger(prev => (prev ? null : prev));
      setPausingBuyBox(prev => (prev ? null : prev));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!subscriber) return;
    api.get('/api/dealfeed/deals/dashboard/kpis')
      .then(data => setKpis(data))
      .catch(() => {});
  }, [subscriber]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-page)', color: 'var(--muted-foreground)', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (!subscriber) return null;

  return (
    <ReadStateProvider>
    <DealStateProvider>
    <DealsProvider>
      <InitialRouteGate />
      <div className="app has-sidebar">
        <TopHeader />

        <div className="app-body">
          <LeftPanel
            view={isOnDeal && !isModal ? null : view}
            setView={handleSetView}
            kpis={kpis}
            onCreateBuyBox={() => navigate('/buy-boxes/new')}
            unreadCount={kpis?.unread_count || 0}
            feedFilter={feedFilter}
            setFeedFilter={setFeedFilter}
          />

          <main className={`app-content${noScroll ? ' no-scroll' : ''}`} data-screen-label={view}>
            <Routes>
              <Route path="/buy-boxes/new" element={<BuyBoxPage mode="new" />} />
              <Route path="/buy-boxes/:id/edit" element={<BuyBoxPage mode="edit" />} />
              <Route path="/*" element={
                <>
                  {isOnDeal && !isModal && (
                    <DealDetailPage dealId={dealMatch.params.dealId}/>
                  )}

                  {(!isOnDeal || isModal) && (
                    <>
                      {view === 'dashboard' && (
                        <Suspense fallback={<ExcelFeedFallback />}>
                          <DealFeedExcelView />
                        </Suspense>
                      )}
                      {view === 'map'      && <MapView onOpenDeal={handleOpenDeal}/>}
                      {view === 'boxes'    && (
                        <BuyBoxesView
                          onCreate={() => navigate('/buy-boxes/new')}
                          onEdit={(box) => navigate('/buy-boxes/' + box.id + '/edit')}
                          onEditGeo={(box) => navigate('/buy-boxes/' + box.id + '/edit')}
                          onPause={setPausingBuyBox}
                        />
                      )}
                      {view === 'calendar' && (
                        <Suspense fallback={<ExcelFeedFallback />}>
                          <DealFeedExcelView />
                        </Suspense>
                      )}
                      {view === 'settings' && <SettingsView onConfirmDanger={setConfirmDanger}/>}
                      {view === 'accounts' && <AccountsView/>}
                      {view === 'invites'  && <InviteView/>}
                      {view === 'admin'    && <AdminView/>}
                    </>
                  )}

                  {isModal && <DealDetailModal dealId={dealMatch.params.dealId}/>}
                </>
              }/>
            </Routes>
          </main>
        </div>

        {confirmDanger && <ConfirmModal kind={confirmDanger} onClose={() => setConfirmDanger(null)}/>}
        {pausingBuyBox && <PauseBoxConfirm buyBox={pausingBuyBox} onClose={() => setPausingBuyBox(null)}/> }
      </div>
    </DealsProvider>
    </DealStateProvider>
    </ReadStateProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
    <Routes>
      <Route path="/login" element={<LoginView/>}/>
      <Route path="/forgot-password" element={<ForgotPasswordView/>}/>
      <Route path="/reset-password" element={<ResetPasswordView/>}/>
      <Route path="/invite/:token" element={<InviteClaimView/>}/>
      <Route path="/*" element={<AppShell/>}/>
    </Routes>
    </ToastProvider>
  );
}
