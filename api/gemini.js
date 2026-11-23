/* ======================================================================
   LJK VISION AI — backend proxy Gemini (Vercel Serverless Function)

   Variabel lingkungan yang WAJIB diatur di Vercel → Project Settings
   → Environment Variables:
     GEMINI_API_KEY = kunci Google AI Studio (rahasia, tidak pernah ke browser)
     ACCESS_CODE    = kode akses bersama untuk memakai backend ini

   Browser hanya mengirim { accessCode, model, prompt, image, wantJson }
   ke /api/gemini. API key tidak pernah dikirim atau disimpan di browser.
   ====================================================================== */

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const ALLOWED_MODELS = new Set([
  'gemini-3.5-flash-lite',
  'gemini-4-hydrogen',
  'gemini-4-carbon',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite'
]);
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_CHARS = 6 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 120000;

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function sameSecret(a, b) {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);
  if (!x.length || x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function friendlyError(status, message) {
  const m = String(message || '').replace(/\s+/g, ' ').trim();
  const detail = m ? ' Detail Google: ' + m.slice(0, 260) : '';
  if (/API[_ ]?key[_ ]?(not[_ ]?valid|invalid|expired)|API_KEY_INVALID/i.test(m))
    return 'API Key di server tidak valid / sudah dicabut. Perbarui GEMINI_API_KEY di Vercel.' + detail;
  if (/referrer|HTTP_REFERRER|origin.*block|API_KEY_HTTP_REFERRER_BLOCKED/i.test(m))
    return 'API Key diblokir oleh Application restrictions. Atur application restrictions = None di AI Studio.' + detail;
  if (/SERVICE_DISABLED|API not enabled|permission denied/i.test(m))
    return 'Gemini API belum aktif untuk project di GEMINI_API_KEY.' + detail;
  if (status === 400) return 'Permintaan ditolak Gemini (400).' + detail;
  if (status === 401 || status === 403) return 'API Key di server ditolak Google (' + status + ').' + detail;
  if (status === 404) return 'Model tidak tersedia di server. Perbarui daftar model di api/gemini.js.' + detail;
  if (status === 429) return 'Kuota / rate limit Gemini penuh. Coba lagi beberapa saat.' + detail;
  if (status >= 500) return 'Server Gemini sedang bermasalah (' + status + ').' + detail;
  return m || 'Terjadi kesalahan pada layanan AI.';
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Permintaan terlalu besar (maksimal 8 MB).'));
        if (typeof req.destroy === 'function') req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const all = new Uint8Array(size);
      let offset = 0;
      chunks.forEach((c) => { all.set(c, offset); offset += c.length; });
      resolve(new TextDecoder().decode(all));
    });
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      configured: !!(process.env.GEMINI_API_KEY && process.env.ACCESS_CODE),
      models: Array.from(ALLOWED_MODELS)
    });
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Metode tidak diizinkan. Gunakan POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || '';
  const accessCode = process.env.ACCESS_CODE || '';
  if (!apiKey || !accessCode) {
    return sendJson(res, 500, {
      ok: false,
      error: 'Backend belum dikonfigurasi. Atur GEMINI_API_KEY dan ACCESS_CODE di Vercel → Project Settings → Environment Variables, lalu redeploy.'
    });
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    return sendJson(res, 400, { ok: false, error: 'Format permintaan tidak valid: ' + e.message });
  }
  if (!body || typeof body !== 'object') {
    return sendJson(res, 400, { ok: false, error: 'Format permintaan tidak valid.' });
  }
  if (!sameSecret(body.accessCode, accessCode)) {
    return sendJson(res, 401, { ok: false, error: 'Kode Akses salah atau belum diisi. Buka menu Koneksi AI di aplikasi.' });
  }

  const prompt = String(body.prompt || '').trim();
  if (!prompt) return sendJson(res, 400, { ok: false, error: 'Prompt kosong.' });
  if (prompt.length > 200000) return sendJson(res, 400, { ok: false, error: 'Prompt terlalu panjang.' });

  const parts = [{ text: prompt }];
  if (body.image && body.image.data) {
    const mime = String(body.image.mime || 'image/jpeg');
    const data = String(body.image.data);
    if (!/^image\/(jpeg|png|webp)$/i.test(mime)) {
      return sendJson(res, 400, { ok: false, error: 'Format gambar harus JPG, PNG, atau WebP.' });
    }
    if (!/^[A-Za-z0-9+/=\s]+$/.test(data) || data.length > MAX_IMAGE_CHARS) {
      return sendJson(res, 400, { ok: false, error: 'Data gambar tidak valid atau terlalu besar.' });
    }
    parts.push({ inline_data: { mime_type: mime, data: data.replace(/\s/g, '') } });
  }

  const model = ALLOWED_MODELS.has(body.model) ? body.model : DEFAULT_MODEL;
  const generationConfig = { temperature: 0.15, maxOutputTokens: 8192 };
  if (body.wantJson !== false) generationConfig.responseMimeType = 'application/json';

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent';
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS) : null;

  let upstream, payload;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }),
      signal: controller ? controller.signal : undefined
    });
    payload = await upstream.json().catch(() => ({}));
  } catch (e) {
    if (e && e.name === 'AbortError') {
      return sendJson(res, 504, { ok: false, error: 'Gemini terlalu lama merespons. Coba gambar yang lebih kecil atau model yang lebih cepat.' });
    }
    return sendJson(res, 502, { ok: false, error: 'Gagal menghubungi Gemini: ' + e.message });
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!upstream.ok) {
    const msg = payload && payload.error && payload.error.message;
    return sendJson(res, upstream.status, { ok: false, error: friendlyError(upstream.status, msg) });
  }

  const feedback = payload.promptFeedback || {};
  if (feedback.blockReason) {
    return sendJson(res, 400, { ok: false, error: 'Permintaan diblokir Gemini (' + feedback.blockReason + ').' });
  }
  const cand = payload.candidates && payload.candidates[0];
  if (!cand) {
    return sendJson(res, 502, { ok: false, error: 'Gemini tidak mengembalikan jawaban. ' + JSON.stringify(feedback).slice(0, 150) });
  }
  if (cand.finishReason === 'MAX_TOKENS') {
    return sendJson(res, 400, { ok: false, error: 'Jawaban AI terpotong (MAX_TOKENS). Kurangi jumlah soal atau coba model lain.' });
  }
  if (cand.finishReason === 'SAFETY') {
    return sendJson(res, 400, { ok: false, error: 'Permintaan diblokir filter keamanan Gemini.' });
  }

  const text = (((cand.content || {}).parts) || [])
    .filter((p) => p && p.text)
    .map((p) => p.text)
    .join('');
  if (!text) return sendJson(res, 502, { ok: false, error: 'Gemini mengembalikan respons kosong.' });

  return sendJson(res, 200, { ok: true, text, model });
}

module.exports = handler;
module.exports.config = { maxDuration: 120 };
