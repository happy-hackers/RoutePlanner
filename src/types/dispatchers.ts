import type { Order } from "./order";

export interface Dispatcher {
  orders?: Order[];
  id: number;
  name: string;
  email?: string;
  phone?: string;
  authUserId?: string;
  activeDay: Record<string, string[]>;
  responsibleArea: string[][];
}
