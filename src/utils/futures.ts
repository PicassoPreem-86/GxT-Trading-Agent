const FUTURES_MULTIPLIER: Record<string, number> = {
  "ES=F": 50,
  "NQ=F": 20,
  "YM=F": 5,
  "RTY=F": 50,
  "CL=F": 1000,
  "GC=F": 100,
};

export function getMultiplier(symbol: string): number {
  return FUTURES_MULTIPLIER[symbol.toUpperCase()] ?? 1;
}

export function isFutures(symbol: string): boolean {
  return symbol.includes("=F");
}

export function formatPrice(price: number, symbol: string): string {
  if (isFutures(symbol)) {
    return price.toFixed(2);
  }
  return `$${price.toFixed(2)}`;
}

export function contractLabel(symbol: string): string {
  return isFutures(symbol) ? "contracts" : "shares";
}

export function qtyLabel(symbol: string): string {
  return isFutures(symbol) ? "ct" : "sh";
}
