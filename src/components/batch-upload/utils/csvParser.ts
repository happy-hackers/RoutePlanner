import type { Order } from "../../../types/order";
import type { TimePeriod } from "../../../store/orderSlice";

export interface ParseResult {
  orders: Order[];
  usedDefaults: {
    orderId: number;
    usedDefaultDate: boolean;
    usedDefaultTime: boolean;
  }[];
}

export const parseCSV = (
  csvText: string,
  fallbackDate: string,
  fallbackTime: TimePeriod
): ParseResult => {
  const lines = csvText.trim().split("\n");
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());

  const orders: Order[] = [];
  const usedDefaults: {
    orderId: number;
    usedDefaultDate: boolean;
    usedDefaultTime: boolean;
  }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const order: Partial<Order> = {};
    let usedDefaultDate = false;
    let usedDefaultTime = false;

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || "";

      switch (header.toLowerCase()) {
        case "id":
          order.id = parseInt(value) || 0;
          break;
        case "date":
          if (!value) {
            order.date = fallbackDate;
            usedDefaultDate = true;
          } else {
            order.date = value;
          }
          break;
        case "time":
          if (!value) {
            order.time = fallbackTime;
            usedDefaultTime = true;
          } else {
            order.time = value as TimePeriod;
          }
          break;
        case "status":
          order.status = value as
            | "Pending"
            | "Assigned"
            | "In Progress"
            | "Delivered"
            | "Cancelled";
          break;
        case "detailedaddress":
          order.detailedAddress = value;
          break;
        case "area":
          order.area = value;
          break;
        case "district":
          order.district = value;
          break;
        case "lat":
          order.lat = parseFloat(value) || 0;
          break;
        case "lng":
          order.lng = parseFloat(value) || 0;
          break;
        case "dispatcherid":
          order.dispatcherId = parseInt(value) || undefined;
          break;
        case "customerid":
          order.customerId = parseInt(value) || undefined;
          break;
        default:
          break;
      }
    });

    if (
      order.date &&
      order.time &&
      (order.customerId || order.detailedAddress)
    ) {
      const finalOrder = order as Order;
      orders.push(finalOrder);

      if (usedDefaultDate || usedDefaultTime) {
        usedDefaults.push({
          orderId: finalOrder.id || i,
          usedDefaultDate,
          usedDefaultTime,
        });
      }
    }
  }

  return { orders, usedDefaults };
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
};
