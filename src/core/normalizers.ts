import { str } from './utils';

export function normalizeEmail(value: unknown): string | undefined {
  const s = str(value, 254).toLowerCase().replace(/^mailto:/i, '');
  const match = s.match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);
  return match ? match[0].toLowerCase() : undefined;
}

export function normalizePhone(value: unknown, prefix = '40'): string | undefined {
  let s = str(value, 40);
  if (!s || /@/.test(s)) return undefined;
  s = s.replace(/^tel:/i, '');
  s = s.replace(/(ext|extension|int|interior)\.?\s*\d+$/i, '');
  s = s.replace(/\+/g, '').replace(/\s/g, '').replace(/-/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/[^\d]/g, '');
  s = s.replace(/^00/, '').replace(/^0+/, '');
  if (!s || s.length < 8 || s.length > 15) return undefined;
  if (/^(\d)\1+$/.test(s)) return undefined;
  if (s.substring(0, prefix.length) !== prefix) s = prefix + s;
  return s;
}

export function normalizeName(value: unknown): string | undefined {
  let s = str(value, 80).toLowerCase()
    .replace(/^(mr|mrs|ms|miss|dr|prof|domnul|doamna|dl|dna|d-na|d-l)\.?\s+/i, '')
    .replace(/\d+/g, '')
    .replace(/@|https?:\/\/|www\./gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  try {
    s = s.replace(/[^\p{L}\s'\-]/gu, '');
  } catch {
    s = s.replace(/[^a-zA-ZăâîșțĂÂÎȘȚ\s'\-]/g, '');
  }
  s = s.replace(/\s+/g, ' ').trim();
  return s.length >= 2 ? s : undefined;
}

export function normalizeCountry(value: unknown): string | undefined {
  let s = str(value, 40).toLowerCase();
  if (s === 'romania' || s === 'românia' || s === 'rou') s = 'ro';
  return /^[a-z]{2}$/.test(s) ? s : undefined;
}

export function normalizeZip(value: unknown): string | undefined {
  const s = str(value, 20).toLowerCase().replace(/[^\w\- ]/g, '').replace(/[\s\-]/g, '');
  return s.length >= 3 ? s : undefined;
}
