import type {
  AccountState,
  OrderRequest,
  OrderResult,
  Position,
} from "../types/order.js";

export interface Broker {
  name: string;
  getAccount(): Promise<AccountState>;
  placeOrder(order: OrderRequest): Promise<OrderResult>;
  cancelOrder(orderId: string): Promise<void>;
  getPositions(): Promise<Position[]>;
  checkStops(prices: Record<string, number>): Promise<void>;
}
