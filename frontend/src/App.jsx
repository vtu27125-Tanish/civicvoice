import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Home from './components/Home';
import ReportForm from './components/ReportForm';
import OfficialDashboard from './components/OfficialDashboard';
import ChatWidget from './components/ChatWidget';
import CitizenMap from './components/CitizenMap';
import BottomNav from './components/BottomNav';
import AuthScreen from './components/AuthScreen';
import { ToastProvider } from './components/Toast';
import './styles.css';

function decodeRole(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function Profile({ user, onLogout }) {
  return (
    <div className="app-shell">
      <div className="eyebrow" style={{ marginBottom: 8 }}>Vexa AI</div>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Profile</h1>
      <div className="card" style={{ padding: 28 }}>
        {/* Avatar */}
        <div style={{
          width: 64, height: 64, borderRadius: 20, marginBottom: 16,
          background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(124,58,237,0.30)'
        }}>
          <span className="material-symbols-outlined" style={{ color: '#FFFFFF', fontSize: 30 }}>person</span>
        </div>

        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>
          {user?.name}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'capitalize' }}>
          {user?.role} account
        </p>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
          borderRadius: 999, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
          marginBottom: 24
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--brand-teal)' }}>verified</span>
          <span style={{ fontSize: 12, color: 'var(--brand-teal)', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
            Verified Member
          </span>
        </div>

        <button className="btn-secondary" onClick={onLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AppInner() {
  const [token, setToken] = useState(localStorage.getItem('cv_token') || '');
  const [view, setView] = useState('home');

  function handleAuthenticated(newToken) {
    setToken(newToken);
    localStorage.setItem('cv_token', newToken);
  }

  function handleLogout() {
    setToken('');
    localStorage.removeItem('cv_token');
    setView('home');
  }

  if (token) {
    const user = decodeRole(token);
    if (user?.role === 'official' || user?.role === 'admin') {
      return <OfficialDashboard token={token} onLogout={handleLogout} />;
    }

    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Home token={token} onNavigateReport={() => setView('report')} />
            </motion.div>
          )}
          {view === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <CitizenMap token={token} />
            </motion.div>
          )}
          {view === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <ReportForm token={token} />
            </motion.div>
          )}
          {view === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Profile user={user} onLogout={handleLogout} />
            </motion.div>
          )}
        </AnimatePresence>
        <BottomNav active={view} onChange={setView} />
        <ChatWidget token={token} />
      </div>
    );
  }

  return <AuthScreen onAuthenticated={handleAuthenticated} />;
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}