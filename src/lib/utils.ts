import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return '-';
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(d: string | undefined | null): string {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return d;
  }
}

export function parseExcelDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return value;
  }
  if (typeof value === 'number') {
    // Excel serial date
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + value * 86400000);
    return d.toISOString().split('T')[0];
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return String(value);
}
