import {
  callAlightMotion,
  onlyPost,
  sendJson
} from "./_upstream.js";

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;

  const amount = Number(req.body?.amount);

  if (!Number.isSafeInteger(amount) || amount < 1) {
    return sendJson(res, 400, {
      status: false,
      message: "Jumlah Bulk tidak valid."
    });
  }

  try {
    const upstream = await callAlightMotion("bulk", { amount });
    const code = upstream.ok ? 200 : Math.max(400, upstream.statusCode || 400);
    return sendJson(res, code, upstream.data);
  } catch (error) {
    return sendJson(res, Number(error.statusCode || 500), {
      status: false,
      message: "Bulk email gagal diproses. Silakan coba lagi."
    });
  }
}
