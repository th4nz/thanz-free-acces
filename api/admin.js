import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function check() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      if (!token) {
        router.replace('/');
        return;
      }

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', token })
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data && data.valid) {
          if (data.isAdmin) {
            setAuthorized(true);
            setLoading(false);
            return;
          }
          setError('Token is valid but not an admin token.');
        } else {
          setError('Token is invalid.');
        }
      } catch (err) {
        console.error('verify error', err);
        setError('Server error while verifying token.');
      }

      try { localStorage.removeItem('adminToken'); } catch (e) {}
      setLoading(false);
      setAuthorized(false);
      router.replace('/');
    }

    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogout() {
    try { localStorage.removeItem('adminToken'); } catch (e) {}
    router.push('/');
  }

  if (loading) return <div style={{ padding: 24 }}>{error ? error : 'Loading...'}</div>;
  if (!authorized) return null;

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial' }}>
      <h1>Admin Panel</h1>
      <p>Welcome, admin. This is a minimal panel. Add controls as needed.</p>

      <div style={{ marginTop: 16 }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #ddd',
            background: '#fff',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2>Admin Tools (example)</h2>
        <p style={{ color: '#666' }}>
          You can add actions here: list users, disable accounts, view logs, etc.
        </p>

        <div style={{ marginTop: 12, padding: 12, border: '1px dashed #eee', borderRadius: 8 }}>
          <strong>Placeholder:</strong>
          <div style={{ marginTop: 8 }}>
            - Add user management UI<br />
            - Add analytics or logs viewer<br />
            - Add server-side verified actions (recommended)
          </div>
        </div>
      </section>
    </div>
  );
}
