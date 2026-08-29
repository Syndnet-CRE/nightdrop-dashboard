import { useParams, useNavigate } from 'react-router-dom';
import { useDeals } from '../contexts/DealsContext';
import { BuyBoxWizard } from '../components/BuyBoxWizard';

export default function BuyBoxPage({ mode }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { buyBoxes, loading } = useDeals();

  const initialData = mode === 'edit' && id
    ? (buyBoxes || []).find(b => String(b.id) === id)
    : null;

  if (mode === 'edit' && id && loading && !initialData) {
    return (
      <div className="page" style={{ padding: '48px 24px' }}>
        Loading…
      </div>
    );
  }

  if (mode === 'edit' && id && !loading && !initialData) {
    return (
      <div className="page" style={{ padding: '48px 24px' }}>
        <h1 style={{ marginBottom: 12 }}>Buy box not found</h1>
        <p style={{ marginBottom: 24, color: 'var(--fg-muted, #9a9a9a)' }}>
          This buy box no longer exists.
        </p>
        <button
          type="button"
          className="bb-btn"
          onClick={() => navigate('/buy-boxes')}
        >
          Back to Buy Boxes
        </button>
      </div>
    );
  }

  return (
    <BuyBoxWizard
      mode={mode === 'edit' ? 'edit' : 'new'}
      initialData={initialData || null}
      onSuccess={() => navigate('/buy-boxes')}
      onCancel={() => navigate(-1)}
    />
  );
}
