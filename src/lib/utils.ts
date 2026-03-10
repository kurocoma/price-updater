import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 税込価格を計算（切り捨て）
 */
export function calcTaxIncludedPrice(
  taxExcludedPrice: number,
  taxRate: number
): number {
  return Math.floor(taxExcludedPrice * (1 + taxRate / 100));
}
