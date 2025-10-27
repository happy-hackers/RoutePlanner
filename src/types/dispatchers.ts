export interface Dispatcher {
  id: number;
  name: string;
  activeDay: Record<string, string[]>;
  responsibleArea: string[][];
}
