// src/pages/AdminPage.jsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../services/api';

const TABS = ['Stats', 'Payments', 'Verifications', 'Reports', 'Users'];

export default function AdminPage() {
  const [tab, setTab] = useState('Stats');
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminAPI.stats().then(setStats).catch(() => toast.error('Stats failed'));
  }, []);

  useEffect(() => {
    setLoading(true);
    const load = {
      Payments:      () => adminAPI.payments('pending').then(d => setPayments(d.payments || [])),
      Verifications: () => adminAPI.verifications().then(d => setVerifications(d.verifications || [])),
      Reports:       () => adminAPI.reports('pending').then(d => setReports(d.reports || [])),
      Users:         () => adminAPI.users(1, search).then(d => setUsers(d.users || [])),
    };
    load[tab]?.()?.catch(() => {})?.finally(() => setLoading(false));
  }, [tab, search]);

  const Stat = ({ label, value, color }) => (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)' }}>
      <p className="text-2xl font-bold" style={{ color }}>{value ?? '—'}</p>
      <p className="text-xs tg-hint mt-1">{label}</p>
    </div>
  );

  const Card = ({ children }) => (
    <div className="p-4 rounded-2xl space-y-3" style={{ background: 'var(--surface)' }}>
      {children}
    </div>
  );

  const Btn = ({ label, color, onClick }) => (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-80"
      style={{ background: color }}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2 flex-shrink-0">
        <h1 className="text-xl font-bold tg-text">Admin Dashboard</h1>
        <p className="text-xs tg-hint amharic">Fonqa — ፎንቃ</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 px-4 pb-2 flex-shrink-0 custom-scroll">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all"
            style={{
              background: tab === t ? 'var(--brand)' : 'var(--surface)',
              color: tab === t ? '#fff' : 'var(--text-muted)',
            }}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-4 py-3 space-y-3">
        {/* ── Stats */}
        {tab === 'Stats' && stats && (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Total Users"      value={stats.totalUsers}          color="var(--brand)" />
            <Stat label="Active (7d)"       value={stats.activeUsers}         color="#4ade80" />
            <Stat label="New Today"         value={stats.newUsersToday}       color="#60a5fa" />
            <Stat label="Total Matches"     value={stats.totalMatches}        color="#f472b6" />
            <Stat label="Premium Users"     value={stats.premiumUsers}        color="#ffca28" />
            <Stat label="Pending Reports"   value={stats.pendingReports}      color="#f87171" />
            <Stat label="Pending Payments"  value={stats.pendingPayments}     color="#fb923c" />
            <Stat label="Pending Verifs"    value={stats.pendingVerifications} color="#a78bfa" />
          </div>
        )}

        {/* ── Payments */}
        {tab === 'Payments' && (
          loading ? <Spinner /> : payments.length === 0
            ? <Empty label="No pending payments" />
            : payments.map(p => (
              <Card key={p.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold tg-text">{p.user?.firstName}</p>
                    <p className="text-xs tg-hint">@{p.user?.telegramId} · {p.method?.replace('_',' ')}</p>
                    <p className="text-xs tg-hint mt-0.5">{new Date(p.createdAt).toLocaleString()}</p>
                    {p.reference && <p className="text-xs text-blue-400 mt-0.5">Ref: {p.reference}</p>}
                  </div>
                  <p className="font-bold" style={{ color: 'var(--brand)' }}>200 ETB</p>
                </div>
                {p.screenshotUrl && (
                  <img src={p.screenshotUrl} alt="Payment" className="w-full max-h-40 object-contain rounded-lg" />
                )}
                <div className="flex gap-2">
                  <Btn label="✅ Approve" color="#16a34a"
                    onClick={async () => {
                      await adminAPI.approvePayment(p.id);
                      setPayments(ps => ps.filter(x => x.id !== p.id));
                      toast.success('Approved!');
                    }} />
                  <Btn label="❌ Reject" color="#dc2626"
                    onClick={async () => {
                      await adminAPI.rejectPayment(p.id, 'Payment not verified');
                      setPayments(ps => ps.filter(x => x.id !== p.id));
                      toast.success('Rejected');
                    }} />
                </div>
              </Card>
            ))
        )}

        {/* ── Verifications */}
        {tab === 'Verifications' && (
          loading ? <Spinner /> : verifications.length === 0
            ? <Empty label="No pending verifications" />
            : verifications.map(v => (
              <Card key={v.id}>
                <div className="flex items-center gap-3">
                  {v.user?.photos?.[0]?.url && (
                    <img src={v.user.photos[0].url} className="w-12 h-12 rounded-full object-cover" alt="" />
                  )}
                  <div>
                    <p className="font-semibold tg-text">{v.user?.firstName}</p>
                    <p className="text-xs tg-hint">Gesture: <strong>{v.gesture}</strong></p>
                    <p className="text-xs tg-hint">AI score: {v.aiScore?.toFixed(2) ?? 'N/A'}</p>
                  </div>
                </div>
                {v.selfieUrl && (
                  <img src={v.selfieUrl} alt="Selfie" className="w-full max-h-48 object-contain rounded-xl" />
                )}
                <div className="flex gap-2">
                  <Btn label="✅ Approve" color="#16a34a"
                    onClick={async () => {
                      await adminAPI.approveVerification(v.id);
                      setVerifications(vs => vs.filter(x => x.id !== v.id));
                      toast.success('Verified!');
                    }} />
                  <Btn label="❌ Reject" color="#dc2626"
                    onClick={async () => {
                      await adminAPI.rejectVerification(v.id, 'Selfie does not match gesture');
                      setVerifications(vs => vs.filter(x => x.id !== v.id));
                      toast.success('Rejected');
                    }} />
                </div>
              </Card>
            ))
        )}

        {/* ── Reports */}
        {tab === 'Reports' && (
          loading ? <Spinner /> : reports.length === 0
            ? <Empty label="No pending reports" />
            : reports.map(r => (
              <Card key={r.id}>
                <div>
                  <p className="font-semibold tg-text">{r.reported?.firstName}</p>
                  <p className="text-xs tg-hint">Reported by: {r.reporter?.firstName} · Reason: {r.reason}</p>
                  {r.details && <p className="text-xs tg-hint mt-0.5 italic">"{r.details}"</p>}
                </div>
                <div className="flex gap-2">
                  <Btn label="🔨 Ban user" color="#dc2626"
                    onClick={async () => {
                      await adminAPI.banUser(r.reported?.id, `Report: ${r.reason}`);
                      await adminAPI.updateReport(r.id, { status: 'resolved', reviewNote: 'User banned' });
                      setReports(rs => rs.filter(x => x.id !== r.id));
                      toast.success('User banned');
                    }} />
                  <Btn label="✅ Dismiss" color="#6b7280"
                    onClick={async () => {
                      await adminAPI.updateReport(r.id, { status: 'dismissed' });
                      setReports(rs => rs.filter(x => x.id !== r.id));
                      toast.success('Dismissed');
                    }} />
                </div>
              </Card>
            ))
        )}

        {/* ── Users */}
        {tab === 'Users' && (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name / username / ID…"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }} />
            {loading ? <Spinner /> : users.map(u => (
              <Card key={u.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold tg-text">{u.firstName} {u.isBanned ? '🚫' : ''}</p>
                    <p className="text-xs tg-hint">@{u.username || u.telegramId} · {u.profile?.gender} · {u.profile?.age}</p>
                    <p className="text-xs tg-hint">{u.profile?.city} · {u.subscription?.tier}</p>
                  </div>
                  {u.isBanned
                    ? <Btn label="Unban" color="#16a34a" onClick={async () => { await adminAPI.unbanUser(u.id); setUsers(us => us.map(x => x.id === u.id ? { ...x, isBanned: false } : x)); }} />
                    : <Btn label="Ban" color="#dc2626" onClick={async () => { await adminAPI.banUser(u.id, 'Admin ban'); setUsers(us => us.map(x => x.id === u.id ? { ...x, isBanned: true } : x)); }} />
                  }
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-10"><div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
}
function Empty({ label }) {
  return <div className="text-center py-12 tg-hint text-sm">{label}</div>;
}
