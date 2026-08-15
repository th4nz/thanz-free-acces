import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // simple client-side guard: require adminToken in localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) {
      router.replace('/');
      return;
    }

    // Optional: you can verify token server-side here by calling an API endpoint.
    setAuthorized(true);
    setLoading(false);
  }, []);

  function handleLogout() {
    try { localStorage.removeItem('adminToken'); } catch (e) {}
    router.push('/');
  }

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
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
        <h2 style={{ marginBottom: 8 }}>Admin Tools (example)</h2>
        <p style={{ marginTop: 0, color: '#666' }}>
          You can add actions here: list users, disable accounts, view logs, etc.
        </p>

        {/* Example placeholder for future admin controls */}
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
