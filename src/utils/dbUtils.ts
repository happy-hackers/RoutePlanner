import type { Dispatcher } from "../types/dispatchers";
import type { Order } from "../types/order";
import { createClient } from "@supabase/supabase-js";
import camelcaseKeys from "camelcase-keys";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const createOrder = async (
  orderData: Omit<Order, "id">
): Promise<{ success: boolean; data?: Order; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          date: orderData.date,
          time: orderData.time,
          state: orderData.state,
          address: orderData.address,
          lat: orderData.lat,
          lng: orderData.lng,
          postcode: orderData.postcode,
          dispatcher_id: orderData.dispatcherId,
        },
      ])
      .select();
    if (error) {
      console.error("Insert error:", error);
      return {
        success: false,
        error: error.message,
      };
    } else {
      // Currently not need created_time column and change key name to dispatcherId
      const { created_time, ...rest } = data[0];
      const newOrder = {
        ...rest,
      };
      // Change the key name xxx_axx to xxxAxx format
      const camelData = camelcaseKeys(newOrder);
      return {
        success: true,
        data: camelData,
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
  try {
    const { data, error } = await supabase.from("orders").select("*");
    if (error) {
      console.error("Fetch error:", error);
      return;
    } else {
      // Remove create_time from each object since we don't need it currently
      const cleanedArray = data.map(
        ({ created_time, ...rest }) => ({
          ...rest,
        })
      );
      // Change the key name xxx_axx to xxxAxx format
      const camelData = camelcaseKeys(cleanedArray);
      return camelData;
    }
  } catch (err) {
    console.error("Unexpected error during fetch:", err);
    return;
  }
};

export const getAllDispatchers = async (): Promise<
  Dispatcher[] | undefined
> => {
  try {
    const { data, error } = await supabase.from("dispatchers").select("*");
    if (error) {
      console.error("Fetch error:", error);
      return;
    } else {
      // Remove create_time from each object
      const cleanedArray = data.map(
        ({ created_time, ...rest }) => ({
          ...rest,
        })
      );
      // Change the key name xxx_axx to xxxAxx format
      const camelData = camelcaseKeys(cleanedArray);
      return camelData;
    }
  } catch (err) {
    console.error("Unexpected error during fetch:", err);
    return;
  }
};

export const addDispatcher = async (
  dispatcherData: Omit<Dispatcher, "id">
): Promise<{ success: boolean; data?: Order; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("dispatchers")
      .insert([
        {
          name: dispatcherData.name,
          active_day: dispatcherData.activeDay,
          responsible_area: dispatcherData.responsibleArea,
        },
      ])
      .select();
    if (error) {
      console.error("Insert error:", error);
      return {
        success: false,
        error: error.message,
      };
    } else {
      // Currently not need created_time column and change key names
      const { created_time, ...rest } = data[0];
      const newDispatcher = {
        ...rest,
      };
      // Change the key name xxx_axx to xxxAxx format
      const camelData = camelcaseKeys(newDispatcher);
      return {
        success: true,
        data: camelData || "Failed to create order",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

export const updateDispatchers = async (
  dispatcherData: Dispatcher[]
): Promise<{
  success: boolean;
  data?: Dispatcher[];
  error?:
    | {
        id: number;
        error: string;
      }[]
    | string;
}> => {
  try {
    // Change the key name to match the column name in database
    const cleanedUpdates = dispatcherData.map(
      ({ activeDay, responsibleArea, ...rest }) => ({
        ...rest,
        active_day: activeDay,
        responsible_area: responsibleArea,
      })
    );
    const results: any[] = [];
    const errors = [];
    for (const item of cleanedUpdates) {
      const { id, ...fieldsToUpdate } = item;
      const { data, error } = await supabase
        .from("dispatchers")
        .update(fieldsToUpdate)
        .eq("id", id);
      if (error) {
        console.error("Error updating ID:", `${id}: ${error.message}`);
        errors.push({ id, error: error.message });
      } else {
        results.push(data);
      }
    }
    if (errors.length > 0) {
      return {
        success: false,
        error: errors,
      };
    } else {
      console.log("All updates successful");
      return {
        success: true,
        data: results,
        error: errors,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

export const assignDispatcher = async (
  orderId: number,
  dispatcherId: number
): Promise<{ success: boolean; data?: Order; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ dispatcher_id: dispatcherId })
      .eq("id", orderId)
      .select();

    if (error) {
      console.error("Update error:", error);
      return {
        success: false,
        error: error.message,
      };
    } else {
      // Transform the response to match our Order type
      const { created_time, dispatcher_id, ...rest } = data[0];
      const updatedOrder = {
        ...rest,
        dispatcherId: dispatcher_id,
      };
      return {
        success: true,
        data: updatedOrder,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};
