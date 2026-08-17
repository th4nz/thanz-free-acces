import { kv } from "@vercel/kv";
import {
  callAlightMotion,
  onlyPost,
  sendJson,
  validateEmail,
  validateVerificationLink
} from "./_upstream.js";

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;

  const email = validateEmail(req.body?.email);
  const link = validateVerificationLink(req.body?.link);
  const deviceId = String(req.body?.deviceId || "").trim();

  if (!email || !link) {
    return sendJson(res, 400, { status: false, message: "Data tidak lengkap." });
  }

  if (deviceId) {
    try {
      const hasClaimed = await kv.get(`device:${deviceId}`);
      if (hasClaimed) {
        return sendJson(res, 400, { status: false, message: "Perangkat ini sudah pernah melakukan klaim sebelumnya!" });
      }
    } catch (err) {
      // Lanjutkan jika KV belum siap
    }
  }

  try {
    const upstream = await callAlightMotion("verify", { email, link });
    const code = upstream.ok ? 200 : Math.max(400, upstream.statusCode || 400);

    if (!upstream.ok) {
      return sendJson(res, code, upstream.data);
    }

    // Generate Token THNZ-XXX unik
    const thnzToken = "THNZ-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);
    const credits = 5;
    const userData = {
      email,
      thnz_token: thnzToken,
      credits,
      device_id: deviceId,
      created_at: new Date().toISOString(),
      last_reset: Date.now()
    };

    // Simpan ke Vercel KV
    try {
      if (deviceId) {
        await kv.set(`device:${deviceId}`, email);
      }
      await kv.set(`user:${email}`, userData);
      // Masukkan email ke dalam list user untuk admin panel
      await kv.sadd("dravn_user_list", email);
    } catch (err) {
      console.error("KV Save Error:", err);
    }

    return sendJson(res, 200, {
      status: true,
      message: "Verifikasi sukses.",
      data: {
        ...upstream.data,
        thnz_token: thnzToken,
        credits: credits
      }
    });
  } catch (error) {
    return sendJson(res, Number(error.statusCode || 500), {
      status: false,
      message: String(error.message || "Permintaan gagal diproses.")
    });
  }
}
