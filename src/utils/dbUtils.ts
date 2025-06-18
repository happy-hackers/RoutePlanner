import type { Order } from "../types/order.ts";
import { createClient } from "@supabase/supabase-js";

const API_BASE_URL = "http://localhost:4000";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const createOrder = async (
  orderData: Omit<Order, "id">
): Promise<{ success: boolean; data?: Order; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/order/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        data: result.newOrder,
      };
    } else {
      return {
        success: false,
        error: result.error || "Failed to create order",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

export const getAllOrders = async (): Promise<Order[] | undefined> => {
  const { data, error } = await supabase.from("orders").select("*");
  if (error) {
    console.error("Fetch error:", error);
    return;
  } else {
    // Remove create_time from each object since we don't need it currently
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cleanedArray = data.map(({ created_time, ...rest }) => ({
      ...rest,
    }));
    return cleanedArray;
  }
};
