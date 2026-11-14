const CUPS_PER_LITER = 4.22675;
const LB_PER_KG = 2.20462;
const MGDL_PER_MMOLL = 18.0182;

export function litersToCups(liters: number): number {
  return Number((liters * CUPS_PER_LITER).toFixed(1));
}

export function cupsToLiters(cups: number): number {
  return Number((cups / CUPS_PER_LITER).toFixed(2));
}

export function celsiusToFahrenheit(c: number): number {
  return Number(((c * 9) / 5 + 32).toFixed(1));
}

export function fahrenheitToCelsius(f: number): number {
  return Number((((f - 32) * 5) / 9).toFixed(1));
}

export function mgDlToMmolL(mgDl: number): number {
  return Number((mgDl / MGDL_PER_MMOLL).toFixed(1));
}

export function mmolLToMgDl(mmol: number): number {
  return Math.round(mmol * MGDL_PER_MMOLL);
}

export function kgToLb(kg: number): number {
  return Number((kg * LB_PER_KG).toFixed(1));
}

export function lbToKg(lb: number): number {
  return Number((lb / LB_PER_KG).toFixed(1));
}
