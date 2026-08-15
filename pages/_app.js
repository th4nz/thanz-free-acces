import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

function AdminModal({ open, onClose }) {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setError(null);
      setUsername('');
      setToken('');
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, token })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data && data.error ? data.error : 'Login failed');
      if (data.isAdmin) {
        // store admin token locally (short-lived) and redirect to admin panel
        try { localStorage.setItem('adminToken', data.adminToken); } catch (e) {}
        onClose();
        router.push('/admin');
        return;
      }
      setError('Not an admin account');
    } catch (err) {
      setError(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div style={styles.overlay} onMouseDown={onClose}>
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Admin Login</h3>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Username</label>
          <input style={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} />
          <label style={styles.label}>Token / Secret</label>
          <input style={styles.input} value={token} onChange={(e) => setToken(e.target.value)} />
          {error && <div style={styles.error}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose} style={styles.buttonSecondary}>Cancel</button>
            <button type="submit" disabled={loading} style={styles.buttonPrimary}>{loading ? '...' : 'Login'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MyApp({ Component, pageProps }) {
  const [clicks, setClicks] = useState(0);
  const [lastClick, setLastClick] = useState(0);
  const [openAdmin, setOpenAdmin] = useState(false);

  useEffect(() => {
    if (clicks >= 5) {
      setOpenAdmin(true);
      setClicks(0);
    }
  }, [clicks]);

  function handleHiddenClick() {
    const now = Date.now();
    if (now - lastClick > 3000) {
      setClicks(1);
    } else {
      setClicks((c) => c + 1);
    }
    setLastClick(now);
  }

  return (
    <>
      <div style={styles.hiddenTrigger} onClick={handleHiddenClick} title="(hidden) admin trigger" />
      <AdminModal open={openAdmin} onClose={() => setOpenAdmin(false)} />
      <Component {...pageProps} />
    </>
  );
}

const styles = {
  hiddenTrigger: {
    position: 'fixed',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    zIndex: 9999,
    // make it mostly invisible but slightly visible for discoverability on mobile
    background: 'transparent',
    borderRadius: 6,
    // optional subtle border to help you tap it; remove if you want fully hidden
    border: '1px dashed rgba(0,0,0,0.05)'
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
  },
  modal: {
    width: '90%',
    maxWidth: 420,
    background: '#fff',
    padding: 16,
    borderRadius: 8,
    boxShadow: '0 6px 20px rgba(0,0,0,0.2)'
  },
  label: { display: 'block', fontSize: 12, marginTop: 12, marginBottom: 6, color: '#333' },
  input: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' },
  error: { color: 'crimson', marginTop: 8, marginBottom: 8 },
  buttonPrimary: { background: '#111', color: '#fff', padding: '8px 12px', borderRadius: 6, border: 'none' },
  buttonSecondary: { background: '#fff', color: '#111', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }
};
