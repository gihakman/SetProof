import { EXPLORER, TIERS } from '../config.js';

export function shortAddr(addr, head = 6, tail = 4) {
  if (!addr) return '';
  const s = String(addr);
  if (s.length <= head + tail + 2) return s;
  return `${s.slice(0, head + 2)}…${s.slice(-tail)}`;
}

export function shortTx(hash) {
  return shortAddr(hash, 8, 6);
}

export function tierLabel(tier) {
  const map = {
    TIER_1_EXCELLENT: 'Excellent',
    TIER_2_GOOD: 'Good',
    TIER_3_ACCEPTABLE: 'Acceptable',
    TIER_4_POOR: 'Poor',
  };
  return map[tier] || tier || '—';
}

export function tierClass(tier) {
  switch (tier) {
    case 'TIER_1_EXCELLENT':
      return 'tier--t1';
    case 'TIER_2_GOOD':
      return 'tier--t2';
    case 'TIER_3_ACCEPTABLE':
      return 'tier--t3';
    case 'TIER_4_POOR':
    default:
      return 'tier--t4';
  }
}

export function tierIndex(tier) {
  const i = TIERS.indexOf(tier);
  return i === -1 ? 0 : i;
}

export function explorerTx(hash) {
  return `${EXPLORER}/tx/${hash}`;
}

export function explorerAddr(addr) {
  return `${EXPLORER}/address/${addr}`;
}

export function fmtRateBps(bps) {
  if (bps === undefined || bps === null) return '—';
  const pct = Number(bps) / 100;
  return `${pct.toFixed(pct < 1 && pct > 0 ? 2 : 1)}%`;
}

export function fmtDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  } catch {
    return iso;
  }
}
