export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ status: false, error: 'Method Not Allowed' });
    }

    const { email, magicLink } = req.body;
    // Mengambil dari Vercel Environment Variables
    const API_BASE = process.env.API_BASE;
    const API_KEY = process.env.API_KEY;

    if (!API_BASE || !API_KEY) {
        return res.status(500).json({ status: false, error: 'Server environment variables not configured' });
    }

    try {
        const targetUrl = `${API_BASE}/api/am?action=verif&apikey=${API_KEY}&email=${encodeURIComponent(email)}&url=${encodeURIComponent(magicLink)}`;
        const response = await fetch(targetUrl);
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
}