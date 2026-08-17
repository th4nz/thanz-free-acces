import { kv } from "@vercel/kv";
import { sendJson, onlyGet } from "../_upstream.js";

export default async function handler(req, res) {
  if (!onlyGet(req, res)) return;

  try {
    const emails = await kv.smembers("dravn_user_list");
    if (!emails || emails.length === 0) {
      return sendJson(res, 200, { status: true, data: [] });
    }

    const users = [];
    for (const email of emails) {
      const data = await kv.get(`user:${email}`);
      if (data) {
        // Cek reset kredit otomatis 24 jam (86400000 ms)
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (now - data.last_reset > oneDay) {
          data.credits = 5;
          data.last_reset = now;
          await kv.set(`user:${email}`, data);
        }
        users.push(data);
      }
    }

    // Urutkan dari yang terbaru
    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return sendJson(res, 200, { status: true, data: users });
  } catch (error) {
    return sendJson(res, 500, { status: false, message: "Gagal mengambil data user dari KV." });
  }
}
