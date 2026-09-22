/**
 * عميل الاتصال بخادم المعالجة الرقمية (FastAPI Client)
 * يربط واجهة React بالخادم على المنفذ 8000.
 */
const API_BASE_URL = 'http://127.0.0.1:8000';

export async function checkBackendHealth() {
  try {
    const t0 = performance.now();
    const res = await fetch(`${API_BASE_URL}/api/health`);
    const latency = Math.round(performance.now() - t0);
    if (res.ok) {
      const data = await res.json();
      return { online: true, latency: `${latency}ms`, data };
    }
    return { online: false, latency: 'ERR', data: null };
  } catch (error) {
    return { online: false, latency: 'OFFLINE', error };
  }
}

export async function applyPixelOperation(endpoint, payload) {
  const res = await fetch(`${API_BASE_URL}/api/pixel/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'فشلت المعالجة' }));
    throw new Error(err.detail || 'حدث خطأ أثناء معالجة الصورة');
  }

  return await res.json();
}

export async function applySpatialOperation(endpoint, payload) {
  const res = await fetch(`${API_BASE_URL}/api/spatial/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'فشلت المعالجة المكانية' }));
    throw new Error(err.detail || 'حدث خطأ أثناء تطبيق الفلتر المكاني');
  }

  return await res.json();
}

/**
 * عميل وحدة الذكاء الاصطناعي: عزل الخلفية (U-2-Net + GrabCut) واستوديو المنتجات.
 * يستدعي مسارات /api/ai/* على خادم FastAPI.
 */
/**
 * عميل وحدة الذكاء الاصطناعي: عزل الخلفية (U-2-Net + GrabCut) واستوديو المنتجات.
 * يستدعي مسارات /api/ai/* على خادم FastAPI.
 */
export async function applyAIOperation(endpoint, payload) {
  const res = await fetch(`${API_BASE_URL}/api/ai/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'فشلت عملية الذكاء الاصطناعي' }));
    throw new Error(err.detail || 'حدث خطأ أثناء عزل الخلفية أو الدمج');
  }

  return await res.json();
}

/**
 * عميل الوحدات الختامية: التحويلات الهندسية، مزج الطبقات، المجال الترددي FFT، والتصدير.
 * يستدعي المسارات /api/transform/* و /api/blend/* و /api/frequency/* و /api/export/*.
 */
export async function applyFinalOperation(path, payload) {
  const res = await fetch(`${API_BASE_URL}/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'فشلت العملية' }));
    throw new Error(err.detail || 'حدث خطأ أثناء تنفيذ العملية الختامية');
  }

  return await res.json();
}

/**
 * تنزيل Data URI كملف محلي على جهاز المستخدم (لزر التصدير النهائي).
 */
export function downloadDataUri(dataUri, filename = 'pixelmatrix-export.png') {
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

