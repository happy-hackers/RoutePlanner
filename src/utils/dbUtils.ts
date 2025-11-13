import type { Dispatcher } from "../types/dispatchers";
import type { Order, OrderStatus } from "../types/order";
import type { Customer } from "../types/customer";
import type { DeliveryRoute } from "../types/delivery-route";
import { createClient } from "@supabase/supabase-js";
import camelcaseKeys from "camelcase-keys";
import snakecaseKeys from "snakecase-keys";
import type { Route } from "../types/route";
import { supabaseAdmin } from "./supabaseAdmin";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
//const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY!;


export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const createOrder = async (
  orderData: Omit<Order, "id">
): Promise<{ success: boolean; data?: Order; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .insert(snakecaseKeys(orderData))
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
    const { data, error } = await supabase
    .from("orders")
    .select(`
      *, 
      customer:customers(*)
      `);
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
      const camelData = camelcaseKeys(cleanedArray, { deep: true });
      return camelData;
    }
  } catch (err) {
    console.error("Unexpected error during fetch:", err);
    return;
  }
};

export const updateOrder = async (
  orderData: Order
) => {
  try {
    const { id, ...fieldsToUpdate } = orderData;
    const { error } = await supabase
      .from("orders")
      .update(snakecaseKeys(fieldsToUpdate))
      .eq("id", id);
    if (error) {
        console.error("Error updating ID:", `${id}: ${error.message}`);
        return {
          success: false,
          error: error
        }
    } else {
      return {
        success: true
      }
    }  
  } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error occurred",
      };
    }
};

export const getAllCustomers = async (): Promise<
  Customer[] | undefined
> => {
  try {
    const { data, error } = await supabase.from("customers").select("*");
    if (error) {
      console.error("Fetch error:", error);
      return;
    } else {
      // Remove create_time from each object
      const cleanedArray = data.map(({ created_time, ...rest }) => ({
        ...rest,
      }));
      // Change the key name xxx_axx to xxxAxx format
      const camelData = camelcaseKeys(cleanedArray, { deep: true });
      return camelData;
    }
  } catch (err) {
    console.error("Unexpected error during fetch:", err);
    return;
  }
};

export const addCustomer = async (
  customerData: Omit<Customer, "id">
): Promise<{ success: boolean; data?: Customer; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .insert(snakecaseKeys(customerData))
      .select();
    if (error) {
      console.error("Insert error:", error);
      return {
        success: false,
        error: error.message,
      };
    } else {
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

export const updateCustomer = async (
  customerData: Customer
) => {
  try {
    const { id, ...fieldsToUpdate } = customerData;
    const { error } = await supabase
      .from("customers")
      .update(snakecaseKeys(fieldsToUpdate))
      .eq("id", id);
    if (error) {
        console.error("Error updating ID:", `${id}: ${error.message}`);
        return {
          success: false,
          error: error
        }
    } else {
      return {
        success: true
      }
    }
  } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error occurred",
      };
    }
};

export const deleteCustomer = async (
  customerId: number
): Promise<{ success: boolean; error?: string; orderCount?: number }> => {
  try {
    // First, check how many orders this customer has
    const { count, error: countError } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customerId);

    if (countError) {
      console.error("Error checking orders:", countError);
      return {
        success: false,
        error: countError.message,
      };
    }

    // Delete all orders for this customer first (cascade delete pattern)
    if (count && count > 0) {
      const { error: deleteOrdersError } = await supabase
        .from("orders")
        .delete()
        .eq("customer_id", customerId);

      if (deleteOrdersError) {
        console.error("Error deleting orders:", deleteOrdersError);
        return {
          success: false,
          error: deleteOrdersError.message,
        };
      }
    }

    // Then delete the customer
    const { error: deleteCustomerError } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);

    if (deleteCustomerError) {
      console.error("Error deleting customer:", deleteCustomerError);
      return {
        success: false,
        error: deleteCustomerError.message,
      };
    }

    return {
      success: true,
      orderCount: count || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

export const getAllDispatchers = async (): Promise<
  Dispatcher[] | undefined
> => {
  try {
    const { data, error } = await supabase.from("dispatchers").select("id, name, email, phone, auth_user_id, active_day, responsible_area, created_time");
    if (error) {
      console.error("Fetch error:", error);
      return;
    } else {
      // Remove create_time from each object
      const cleanedArray = data.map(({ created_time, ...rest }) => ({
        ...rest,
      }));
      // Change the key name xxx_axx to xxxAxx format
      const camelData = camelcaseKeys(cleanedArray);
      return camelData;
    }
  } catch (err) {
    console.error("Unexpected error during fetch:", err);
    return;
  }
};

export const getAllRoutes = async (): Promise<
  Route[] | undefined
> => {
  try {
    const { data, error } = await supabase.from("delivery_routes").select("*");
    if (error) {
      console.error("Fetch error:", error);
      return;
    } else {
      // Remove create_time from each object
      const cleanedArray = data.map(({ created_time, updated_time, ...rest }) => ({
        ...rest,
      }));
      // Change the key name xxx_axx to xxxAxx format
      const camelData = camelcaseKeys(cleanedArray, { deep: true });
      return camelData;
    }
  } catch (err) {
    console.error("Unexpected error during fetch:", err);
    return;
  }
};

export const addRoute = async (
  route: Omit<Route, "id">
): Promise<{ success: boolean; data?: Route[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("delivery_routes")
      .insert(snakecaseKeys(route))
      .select();

    if (error) {
      console.error("Insert error:", error);
      return {
        success: false,
        error: error.message,
      };
    } else {
      const { created_time, updated_time, ...rest } = data[0];
      const newRoute = {
        ...rest,
      };
      // Change the key name xxx_axx to xxxAxx format
      const camelData = camelcaseKeys(newRoute);
      return {
        success: true,
        data: camelData,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error occurred",
    };
  }
};

export const updateRouteIsActive = async (
  isActive: boolean,
  routeId: number
): Promise<{ success: boolean; data?: Route; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("delivery_routes")
      .update({ is_active: isActive })
      .eq("id", routeId)
      .select();

    if (error) {
      console.error("Update error:", error);
      return {
        success: false,
        error: error.message,
      };
    } else {
      // Transform the response to match our Order type
      const { created_time, updated_time, ...rest } = data[0];
      const updatedRoute = {
        ...rest,
      };
      return {
        success: true,
        data: updatedRoute,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

export const addRoutes = async (
  routes: Omit<Route, "id">[]
): Promise<{ success: boolean; data?: Route[]; error?: string }> => {
  try {
    console.log("payload", JSON.stringify(routes.map(r => snakecaseKeys(r)), null, 2));
    const { data, error } = await supabase
      .from("delivery_routes")
      .insert(routes.map((r) => snakecaseKeys(r)))
      .select();

    if (error) {
      console.error("Insert error:", error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "No data returned from insert" };
    }

    const camelData = data.map((item) => camelcaseKeys(item));
    return { success: true, data: camelData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error occurred",
    };
  }
};

export const addDispatcher = async (
  dispatcherData: Omit<Dispatcher, "id">
): Promise<{ success: boolean; data?: Dispatcher; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("dispatchers")
      .insert([
        {
          name: dispatcherData.name,
          email: dispatcherData.email,
          phone: dispatcherData.phone,
          auth_user_id: dispatcherData.authUserId,
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
    const results: any[] = [];
    const errors = [];
    for (const item of dispatcherData) {
      const { id, ...fieldsToUpdate } = item;
      const { data, error } = await supabase
        .from("dispatchers")
        .update(snakecaseKeys(fieldsToUpdate))
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

export const deleteDispatcher = async (
  dispatcherId: number
): Promise<{ success: boolean; error?: string; orderCount?: number }> => {
  try {
    // First, get the dispatcher to retrieve auth_user_id
    const { data: dispatcher, error: fetchError } = await supabase
      .from("dispatchers")
      .select("auth_user_id")
      .eq("id", dispatcherId)
      .single();

    if (fetchError) {
      console.error("Error fetching dispatcher:", fetchError);
      return {
        success: false,
        error: fetchError.message,
      };
    }

    const authUserId = dispatcher?.auth_user_id;

    // Check how many orders are assigned to this dispatcher
    const { count, error: countError } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("dispatcher_id", dispatcherId);

    if (countError) {
      console.error("Error checking orders:", countError);
      return {
        success: false,
        error: countError.message,
      };
    }

    // Update orders based on their current status
    if (count && count > 0) {
      // For active orders ("In Progress", "Assigned"): reset to "Pending"
      const { error: updateActiveOrdersError } = await supabase
        .from("orders")
        .update({ dispatcher_id: null, status: "Pending" })
        .eq("dispatcher_id", dispatcherId)
        .in("status", ["In Progress", "Assigned"]);

      if (updateActiveOrdersError) {
        console.error("Error updating active orders:", updateActiveOrdersError);
        return {
          success: false,
          error: updateActiveOrdersError.message,
        };
      }

      // For completed orders ("Delivered", "Cancelled"): only remove dispatcher_id
      const { error: updateCompletedOrdersError } = await supabase
        .from("orders")
        .update({ dispatcher_id: null })
        .eq("dispatcher_id", dispatcherId)
        .in("status", ["Delivered", "Cancelled"]);

      if (updateCompletedOrdersError) {
        console.error("Error updating completed orders:", updateCompletedOrdersError);
        return {
          success: false,
          error: updateCompletedOrdersError.message,
        };
      }
    }

    // Delete the dispatcher record
    const { error: deleteDispatcherError } = await supabase
      .from("dispatchers")
      .delete()
      .eq("id", dispatcherId);

    if (deleteDispatcherError) {
      console.error("Error deleting dispatcher:", deleteDispatcherError);
      return {
        success: false,
        error: deleteDispatcherError.message,
      };
    }

    // Delete associated auth user if exists
    if (authUserId) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
        authUserId
      );

      if (deleteAuthError) {
        console.error("Error deleting auth user:", deleteAuthError);
        // Don't fail the whole operation if auth deletion fails
        // The dispatcher record is already deleted
        console.warn(`Dispatcher deleted but auth user ${authUserId} could not be deleted`);
      }
    }

    return {
      success: true,
      orderCount: count || 0,
    };
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

// ========== DeliveryRoute Functions ==========

// Get driver's active route for a specific date
// Note: Fetches fresh order data to ensure current status is reflected
export const getDriverActiveRoute = async (
  dispatcherId: number,
  routeDate?: string
): Promise<DeliveryRoute | null> => {
  const date = routeDate || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('delivery_routes')
    .select('*')
    .eq('dispatcher_id', dispatcherId)
    .eq('route_date', date)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  // Extract order IDs from the route's order_sequence
  const orderIds = data.address_meter_sequence
    .flatMap((entry: any) => entry.meters.map((order: any) => order.id));

  // Fetch fresh order data from orders table with current statuses
  const { data: freshOrders, error: ordersError } = await supabase
    .from('orders')
    .select('*, customers(*)')
    .in('id', orderIds);

  if (ordersError || !freshOrders) {
    // Fallback to stale data if fresh fetch fails
    const { created_time, ...rest } = data;
    return camelcaseKeys(rest, { deep: true }) as DeliveryRoute;
  }

  // Clean and convert fresh orders
  const cleanedOrders = freshOrders.map(({ created_time, ...rest }) => ({ ...rest }));
  const camelOrders = camelcaseKeys(cleanedOrders, { deep: true });

  // Merge: maintain route's address meter sequence order but use fresh order data
  const freshAddressMeterSequence = data.address_meter_sequence.map((entry: any) => {
    const freshMeters = entry.meters.map((order: any) =>
      camelOrders.find((o: any) => o.id === order.id)
    ).filter(Boolean); // Remove any null entries

    return {
      address: entry.address,
      lat: entry.lat,
      lng: entry.lng,
      meters: freshMeters,
    };
  });

  // Update route with fresh order sequence
  const { created_time, ...rest } = data;
  const route = camelcaseKeys(rest, { deep: true }) as DeliveryRoute;
  route.addressMeterSequence = freshAddressMeterSequence as any;

  return route;
};

// Update order status (mark as delivered)
export const updateOrderStatus = async (
  orderId: number,
  newStatus: OrderStatus
): Promise<void> => {
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) throw error;
};

// Get all upcoming active routes for driver
export const getDriverUpcomingRoutes = async (
  dispatcherId: number
): Promise<DeliveryRoute[]> => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('delivery_routes')
    .select('*')
    .eq('dispatcher_id', dispatcherId)
    .eq('is_active', true)
    .gte('route_date', today)
    .order('route_date', { ascending: true });

  if (error) throw error;

  return data.map(row => {
    const { created_time, ...rest } = row;
    return camelcaseKeys(rest, { deep: true }) as DeliveryRoute;
  });
};

// Get dispatcher by ID
export const getDispatcherById = async (
  dispatcherId: number
): Promise<Dispatcher | null> => {
  const { data, error } = await supabase
    .from('dispatchers')
    .select('id, name, email, phone, auth_user_id, active_day, responsible_area, created_time')
    .eq('id', dispatcherId)
    .single();

  if (error || !data) return null;

  const { created_time, ...rest } = data;
  return camelcaseKeys(rest) as Dispatcher;
};

// Get dispatcher by auth user ID (for session-based auth)
export const getDispatcherByAuthId = async (
  authUserId: string
): Promise<Dispatcher | null> => {
  const { data, error } = await supabase
    .from('dispatchers')
    .select('id, name, email, phone, auth_user_id, active_day, responsible_area, created_time')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) return null;

  const { created_time, ...rest } = data;
  return camelcaseKeys(rest) as Dispatcher;
};

// Update dispatcher with auth user ID (link auth account to dispatcher)
export const updateDispatcherAuth = async (
  dispatcherId: number,
  email: string,
  authUserId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('dispatchers')
      .update({
        email,
        auth_user_id: authUserId
      })
      .eq('id', dispatcherId);

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update dispatcher auth'
    };
  }
};
