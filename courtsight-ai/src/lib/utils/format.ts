export function round(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function fmtStat(value: number, decimals = 1): string {
  return round(value, decimals).toFixed(decimals);
}

export function fmtInt(value: number): string {
  return Math.round(value).toString();
}

export function fmtPct(value: number, decimals = 0): string {
  return `${round(value * 100, decimals).toFixed(decimals)}%`;
}

export function fmtSigned(value: number, decimals = 1): string {
  const r = round(value, decimals);
  if (r > 0) return `+${r.toFixed(decimals)}`;
  return r.toFixed(decimals);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
