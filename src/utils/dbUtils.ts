import type { Order } from "../features/orders";

const API_BASE_URL = "http://localhost:4000";

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
