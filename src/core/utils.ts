export function has(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function bool(value: unknown): boolean {
  if (value === true || value === 1 || value === '1') return true;
  const s = String(value ?? '').trim().toLowerCase();
  return s === 'true' || s === 'yes';
}

export function enabled(value: unknown, fallback = false): boolean {
  if (!has(value)) return fallback;
  if (value === false || value === 0 || value === '0') return false;
  return bool(value) || ['on', 'enabled'].includes(String(value).trim().toLowerCase());
}

export function str(value: unknown, max = 512): string {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

export function upperCurrency(value: unknown): string | undefined {
  const s = str(value, 8).toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : undefined;
}

export function num(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

export function randomId(prefix = ''): string {
  const a = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return prefix ? `${prefix}_${a}` : a;
}

export function unixSeconds(timestamp?: number): number {
  const t = timestamp || Date.now();
  return t > 9999999999 ? Math.floor(t / 1000) : Math.floor(t);
}

export function flattenKeys(obj: Record<string, unknown> = {}, prefix = ''): Record<string, unknown> {
  return Object.keys(obj).reduce((acc: Record<string, unknown>, key) => {
    const pre = prefix.length ? `${prefix}.` : '';
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenKeys(value as Record<string, unknown>, pre + key));
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v && typeof v === 'object') Object.assign(acc, flattenKeys(v as Record<string, unknown>, `${pre}${key}.${i}`));
        else acc[`${pre}${key}.${i}`] = v;
      });
    } else {
      acc[pre + key] = value;
    }
    return acc;
  }, {});
}

export function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as Record<string, unknown>).length === 0) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getParamSafely(key: string, values: Array<string | undefined>): Record<string, string> {
  for (const value of values) if (value) return { [key]: value };
  return {};
}

export function urlWithParam(urlValue: string, key: string, value: string): string {
  try {
    const url = new URL(urlValue);
    if (!url.searchParams.get(key)) url.searchParams.set(key, value);
    return url.toString();
  } catch {
    return urlValue;
  }
}
