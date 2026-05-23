import { useState } from 'react';
import { I } from '../components/Icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

export function SettingsView({ onConfirmDanger }) {
  const { subscriber } = useAuth();
  const s = subscriber || {};
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwToast, setPwToast] = useState(null);

  const profileFullName = fullName || s.full_name || '';
  const profileCompany = company || s.company || '';

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwNew.length < 12) { setPwToast({ ok: false, msg: 'New password must be at least 12 characters.' }); return; }
    if (pwNew !== pwConfirm) { setPwToast({ ok: false, msg: 'Passwords do not match.' }); return; }
    setPwSaving(true);
    setPwToast(null);
    try {
      await api.post('/api/dealfeed/auth/change-password', { current_password: pwCurrent, new_password: pwNew });
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      setPwToast({ ok: true, msg: 'Password updated.' });
    } catch (err) {
      setPwToast({ ok: false, msg: err.message || 'Failed to update password.' });
    } finally {
      setPwSaving(false);
      setTimeout(() => setPwToast(null), 3000);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      await api.patch('/api/dealfeed/auth/me', {
        full_name: profileFullName,
        company: profileCompany,
        role: s.role || '',
        phone: s.phone || '',
      });
      setToast({ ok: true, msg: 'Profile saved.' });
    } catch (err) {
      setToast({ ok: false, msg: err.message || 'Save failed.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Account Settings</h1>
          <div className="page-sub">Subscriber profile, billing, and account controls</div>
        </div>
      </div>

      <div className="settings-form">
        <div className="settings-section">
          <h3>Profile</h3>
          <form onSubmit={handleSaveProfile}>
          <div className="field-row">
            <div className="field"><label>Full Name</label><input className="input" value={profileFullName} onChange={e => setFullName(e.target.value)} required/></div>
            <div className="field"><label>Email</label><input className="input" value={s.email || ''} type="email" readOnly style={{ opacity: 0.6 }}/></div>
          </div>
          <div className="field"><label>Firm</label><input className="input" value={profileCompany} onChange={e => setCompany(e.target.value)}/></div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn primary" type="submit" disabled={saving}><I.Check size={13}/> {saving ? 'Saving…' : 'Save Changes'}</button>
            {toast && <span style={{ fontSize: 12, color: toast.ok ? '#4CAF50' : 'var(--destructive)' }}>{toast.msg}</span>}
          </div>
          </form>
        </div>

        <div className="settings-section">
          <h3>Password</h3>
          <form onSubmit={handleChangePassword}>
          <div className="field"><label>Current Password</label><input className="input" type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} required/></div>
          <div className="field-row">
            <div className="field"><label>New Password</label><input className="input" type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="At least 12 characters" required/></div>
            <div className="field"><label>Confirm Password</label><input className="input" type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} required/></div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn" type="submit" disabled={pwSaving}>{pwSaving ? 'Updating…' : 'Update Password'}</button>
            {pwToast && <span style={{ fontSize: 12, color: pwToast.ok ? '#4CAF50' : 'var(--destructive)' }}>{pwToast.msg}</span>}
          </div>
          </form>
        </div>

        <div className="settings-section">
          <h3>Subscription</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={{ background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10.5, color: "var(--muted-foreground)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Plan</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, color: "#FFF" }}>Operator · Annual</div>
              <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 4 }}>$2,400/yr · 4 buy boxes incl.</div>
            </div>
            <div style={{ background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10.5, color: "var(--muted-foreground)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Next Billing</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, color: "#FFF" }}>Mar 12, 2027</div>
              <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 4 }}>$2,400 + add-ons</div>
            </div>
            <div style={{ background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10.5, color: "var(--muted-foreground)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Status</div>
              <div style={{ marginTop: 6 }}><span className="pill green"><span className="pip"/>Active</span></div>
              <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 6 }}>Auto-renew on</div>
            </div>
          </div>
          <button className="btn"><I.External size={13}/> Manage Billing in Stripe</button>
        </div>

        <div className="settings-section">
          <h3>Buy Box Add-ons</h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#FFF" }}>5 of 6 buy box slots used</div>
              <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 4 }}>1 slot remaining · additional slots are $50/mo each</div>
            </div>
            <button className="btn outline-green"><I.Plus size={13}/> Add Slot — $50/mo</button>
          </div>
        </div>

        <div className="settings-section">
          <h3 style={{ color: "#FF7378" }}>Danger Zone</h3>
          <div className="danger-zone">
            <div className="danger-row">
              <div className="lbl">
                <b>Pause Account</b>
                <span>Stop nightly runs without losing your buy boxes or data. Resume any time.</span>
              </div>
              <button className="btn danger" onClick={() => onConfirmDanger("pause")}>Pause Account</button>
            </div>
            <div className="danger-row">
              <div className="lbl">
                <b>Cancel Subscription</b>
                <span>End service at the close of the current billing period. Buy boxes are deleted after 30 days.</span>
              </div>
              <button className="btn danger" onClick={() => onConfirmDanger("cancel")}>Cancel Subscription</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
