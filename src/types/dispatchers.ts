export interface Dispatcher {
  orders: any;
  id: number;
  name: string;
  email?: string;
  phone?: string;
  authUserId?: string;
  activeDay: Record<string, string[]>;
  responsibleArea: string[][];
}
