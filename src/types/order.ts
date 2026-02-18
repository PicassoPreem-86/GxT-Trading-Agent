export type OrderSide = "buy" | "sell";
export type OrderStatus = "pending" | "filled" | "cancelled" | "rejected";
export type OrderType = "market" | "limit" | "stop" | "stop_limit";

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  qty: number;
  type: OrderType;
  limitPrice?: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  timeInForce?: "day" | "gtc";
}

export interface OrderResult {
  orderId: string;
  status: OrderStatus;
  filledPrice?: number;
  filledAt?: string;
  message?: string;
}

export interface Position {
  symbol: string;
  side: OrderSide;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  openedAt: string;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number;
  takeProfit: number;
  status: "open" | "closed" | "stopped";
  pnl: number | null;
  rMultiple: number | null;
  confidence: number;
  openedAt: string;
  closedAt: string | null;
  checklistSnapshot: string; // JSON
}

export interface AccountState {
  cash: number;
  equity: number;
  positions: Position[];
  dayPnl: number;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
}
