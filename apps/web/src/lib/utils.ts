import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercentage(val: number | undefined | null) {
  if (val === undefined || val === null) return "-";
  return `${(val * 100).toFixed(2)}%`;
}

export function formatNumber(val: number | undefined | null, decimals = 4) {
  if (val === undefined || val === null) return "-";
  return val.toFixed(decimals);
}
