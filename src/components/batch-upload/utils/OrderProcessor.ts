import type { Order } from "../../../types/order";
import type { Customer } from "../../../types/customer";
import { getAllCustomers } from "../../../utils/dbUtils";
import { findCustomerByAddress } from "../../../utils/addressUtils";
import { geocodeAddressWithDetails } from "../../../utils/geocodingUtils";
import type { NewCustomerData } from "../UploadPreviewModal";

export interface ProcessOrdersResult {
  customersToCreate: NewCustomerData[];
  ordersToCreate: Omit<Order, "id">[];
  failed: { address: string; error: string }[];
}

export class OrderProcessor {
  private geocoder: google.maps.Geocoder;

  constructor(geocoder: google.maps.Geocoder) {
    this.geocoder = geocoder;
  }

  async processOrders(
    validOrders: Partial<Order>[]
  ): Promise<ProcessOrdersResult> {
    const customers = await getAllCustomers();
    if (!customers) {
      throw new Error("Failed to fetch customers");
    }

    const customersToCreate: NewCustomerData[] = [];
    const ordersToCreate: Omit<Order, "id">[] = [];
    const failed: { address: string; error: string }[] = [];
    const customerIdMap = new Map<string, number>();

    for (const order of validOrders) {
      try {
        const result = await this.processOrder(
          order,
          customers,
          customersToCreate,
          customerIdMap
        );

        if (result.success) {
          ordersToCreate.push(result.order);
        } else {
          failed.push({
            address: order.detailedAddress || "Unknown",
            error: result.error,
          });
        }
      } catch (error) {
        failed.push({
          address: order.detailedAddress || "Unknown",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { customersToCreate, ordersToCreate, failed };
  }

  private async processOrder(
    order: Partial<Order>,
    customers: Customer[],
    customersToCreate: NewCustomerData[],
    customerIdMap: Map<string, number>
  ): Promise<
    | { success: true; order: Omit<Order, "id"> }
    | { success: false; error: string }
  > {
    let finalCustomerId: number | undefined;
    let customerData: Customer | NewCustomerData | undefined;

    // Case 1: customerId provided
    if (order.customerId) {
      const existingCustomer = customers.find((c) => c.id === order.customerId);

      if (existingCustomer) {
        if (order.detailedAddress) {
          const addressMatch = findCustomerByAddress(
            customers,
            order.detailedAddress,
            order.area,
            order.district
          );

          if (addressMatch && addressMatch.id !== order.customerId) {
            finalCustomerId = undefined;
            customerData = undefined;
          } else if (!addressMatch) {
            finalCustomerId = undefined;
            customerData = undefined;
          } else {
            finalCustomerId = existingCustomer.id;
            customerData = existingCustomer;
          }
        } else {
          finalCustomerId = existingCustomer.id;
          customerData = existingCustomer;
        }
      }
    }

    // Case 2: No customerId or need to create new customer
    if (!finalCustomerId && order.detailedAddress) {
      const addressMatch = findCustomerByAddress(
        customers,
        order.detailedAddress,
        order.area,
        order.district
      );

      if (addressMatch) {
        finalCustomerId = addressMatch.id;
        customerData = addressMatch;
      } else {
        const addressKey = `${order.detailedAddress}|${order.area || ""}|${
          order.district || ""
        }`;

        if (customerIdMap.has(addressKey)) {
          finalCustomerId = customerIdMap.get(addressKey);
          customerData = customersToCreate.find((c) => c.tempId === addressKey);
        } else {
          const geoResult = await geocodeAddressWithDetails(
            order.detailedAddress,
            this.geocoder
          );

          await new Promise((resolve) => setTimeout(resolve, 100));

          const finalArea = order.area || geoResult.area;
          const finalDistrict = order.district || geoResult.district;

          if (!finalArea || !finalDistrict) {
            return {
              success: false,
              error:
                "Could not determine Hong Kong area/district for this address",
            };
          }

          const newCustomer: NewCustomerData = {
            name: `Customer at ${order.detailedAddress.substring(0, 30)}`,
            openTime: "09:00:00",
            closeTime: "18:00:00",
            detailedAddress: order.detailedAddress,
            area: finalArea,
            district: finalDistrict,
            lat: order.lat || geoResult.lat,
            lng: order.lng || geoResult.lng,
            postcode: order.postcode,
            tempId: addressKey,
          };

          customersToCreate.push(newCustomer);
          customerIdMap.set(addressKey, -1);
          customerData = newCustomer;
        }
      }
    }

    if (finalCustomerId || customerData) {
      const newOrder: Omit<Order, "id"> = {
        date: order.date!,
        time: order.time!,
        status: order.status || "Pending",
        detailedAddress:
          order.detailedAddress || (customerData as Customer).detailedAddress,
        area: order.area || (customerData as Customer).area,
        district: order.district || (customerData as Customer).district,
        lat: order.lat || (customerData as Customer).lat,
        lng: order.lng || (customerData as Customer).lng,
        postcode: order.postcode || (customerData as Customer).postcode,
        customerId: finalCustomerId || 0,
        dispatcherId: order.dispatcherId,
      };

      return { success: true, order: newOrder };
    } else {
      return {
        success: false,
        error: "No customer ID or address provided",
      };
    }
  }
}
