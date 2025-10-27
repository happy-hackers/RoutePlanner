import { useState, useRef, useEffect } from "react";
import { Modal, Button, Upload, App } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { createOrder, getAllCustomers, addCustomer } from "../utils/dbUtils";
import type { Order } from "../types/order";
import type { Customer } from "../types/customer";
import { findCustomerByAddress } from "../utils/addressUtils";
import { geocodeAddressWithDetails } from "../utils/geocodingUtils";
import UploadPreviewModal, { type NewCustomerData } from "./UploadPreviewModal";

const { Dragger } = Upload;

const parseCSV = (csvText: string): Order[] => {
  const lines = csvText.trim().split("\n");
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  console.log("headers", headers)

  const orders: Order[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const order: Partial<Order> = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || "";

      switch (header.toLowerCase()) {
        case "id":
          order.id = parseInt(value) || 0;
          break;
        case "date":
          order.date = value;
          break;
        case "time":
          order.time = value as "Morning" | "Afternoon" | "Evening";
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

    // Now we allow orders without customerId if they have detailedAddress
    if (order.date && order.time && (order.customerId || order.detailedAddress)) {
      orders.push(order as Order);
    }
  }

  return orders;
};

// 辅助函数：正确解析CSV行，处理带引号的字段
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 处理转义的引号
        current += '"';
        i++; // 跳过下一个引号
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // 字段分隔符
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // 添加最后一个字段
  result.push(current);

  return result;
};

function JsonUploadModal({
  isOpen,
  setOpen,
  onUploadComplete
}: {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onUploadComplete: () => void;
}) {
  const { message } = App.useApp();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [newCustomers, setNewCustomers] = useState<NewCustomerData[]>([]);
  const [processedOrders, setProcessedOrders] = useState<Omit<Order, "id">[]>([]);
  const [failedAddresses, setFailedAddresses] = useState<{ address: string; error: string }[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Initialize geocoder
  useEffect(() => {
    if (window.google && window.google.maps && !geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
    setShowPreview(false);
    setNewCustomers([]);
    setProcessedOrders([]);
    setFailedAddresses([]);
    setIsProcessing(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      message.error("Please select a file");
      return;
    }

    if (!geocoderRef.current) {
      message.error("Google Maps is not loaded. Please try again.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      setIsProcessing(true);
      try {
        const fileContent = e.target?.result as string;
        let orders: Partial<Order>[] = [];

        if (
          selectedFile.type === "application/json" ||
          selectedFile.name.endsWith(".json")
        ) {
          const result = JSON.parse(fileContent);
          orders = Array.isArray(result) ? result : [result];
        } else if (
          selectedFile.type === "text/csv" ||
          selectedFile.name.endsWith(".csv")
        ) {
          orders = parseCSV(fileContent);
        }

        // validate basic fields
        const validOrders = orders.filter((order) => {
          return order.date && order.time && (order.customerId || order.detailedAddress);
        });

        if (validOrders.length === 0) {
          message.error("No valid orders found in the file");
          return;
        }

        const customers = await getAllCustomers();
        if (!customers) {
          message.error("Failed to fetch customers");
          return;
        }

        const customersToCreate: NewCustomerData[] = [];
        const ordersToCreate: Omit<Order, "id">[] = [];
        const failed: { address: string; error: string }[] = [];
        const customerIdMap = new Map<string, number>(); // Map temp address to customer ID

        // Process each order
        for (const order of validOrders) {
          try {
            let finalCustomerId: number | undefined;
            let customerData: Customer | NewCustomerData | undefined;

            // Case 1: customerId provided
            if (order.customerId) {
              const existingCustomer = customers.find((c) => c.id === order.customerId);

              if (existingCustomer) {
                // Check if address matches
                if (order.detailedAddress) {
                  const addressMatch = findCustomerByAddress(
                    customers,
                    order.detailedAddress,
                    order.area,
                    order.district
                  );

                  if (addressMatch && addressMatch.id !== order.customerId) {
                    // Address doesn't match the provided customerId, create new customer
                    finalCustomerId = undefined;
                    customerData = undefined;
                  } else if (!addressMatch) {
                    // New address, create new customer
                    finalCustomerId = undefined;
                    customerData = undefined;
                  } else {
                    // Address matches, use existing customer
                    finalCustomerId = existingCustomer.id;
                    customerData = existingCustomer;
                  }
                } else {
                  // No address provided, use existing customer
                  finalCustomerId = existingCustomer.id;
                  customerData = existingCustomer;
                }
              }
            }

            // Case 2: No customerId or need to create new customer
            if (!finalCustomerId && order.detailedAddress) {
              // Try to find existing customer by address
              const addressMatch = findCustomerByAddress(
                customers,
                order.detailedAddress,
                order.area,
                order.district
              );

              if (addressMatch) {
                // Found existing customer with matching address
                finalCustomerId = addressMatch.id;
                customerData = addressMatch;
              } else {
                // Need to create new customer
                const addressKey = `${order.detailedAddress}|${order.area || ""}|${order.district || ""}`;

                // Check if we already planned to create this customer in this batch
                if (customerIdMap.has(addressKey)) {
                  finalCustomerId = customerIdMap.get(addressKey);
                  customerData = customersToCreate.find(
                    (c) => c.tempId === addressKey
                  );
                } else {
                  // Geocode the address
                  if (!geocoderRef.current) {
                    throw new Error("Geocoder not initialized");
                  }

                  const geoResult = await geocodeAddressWithDetails(
                    order.detailedAddress,
                    geocoderRef.current
                  );

                  // Add small delay to avoid rate limiting
                  await new Promise((resolve) => setTimeout(resolve, 100));

                  // Validate that we have valid area and district (from CSV or geocoding)
                  const finalArea = order.area || geoResult.area;
                  const finalDistrict = order.district || geoResult.district;

                  if (!finalArea || !finalDistrict) {
                    throw new Error("Could not determine Hong Kong area/district for this address");
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
                  customerIdMap.set(addressKey, -1); // Placeholder, will be updated after creation
                  customerData = newCustomer;
                }
              }
            }

            // Build the order
            if (finalCustomerId || customerData) {
              const newOrder: Omit<Order, "id"> = {
                date: order.date!,
                time: order.time!,
                status: order.status || "Pending",
                detailedAddress: order.detailedAddress || (customerData as Customer).detailedAddress,
                area: order.area || (customerData as Customer).area,
                district: order.district || (customerData as Customer).district,
                lat: order.lat || (customerData as Customer).lat,
                lng: order.lng || (customerData as Customer).lng,
                postcode: order.postcode || (customerData as Customer).postcode,
                customerId: finalCustomerId || 0, // Will be updated after customer creation
                dispatcherId: order.dispatcherId,
              };
              ordersToCreate.push(newOrder);
            } else {
              failed.push({
                address: order.detailedAddress || "Unknown",
                error: "No customer ID or address provided",
              });
            }
          } catch (error) {
            failed.push({
              address: order.detailedAddress || "Unknown",
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        // Show preview modal
        setNewCustomers(customersToCreate);
        setProcessedOrders(ordersToCreate);
        setFailedAddresses(failed);
        setShowPreview(true);
      } catch (err) {
        message.error(
          `Error processing file: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const confirmUpload = async () => {
    setIsCreating(true);
    try {
      const customerIdMap = new Map<string, number>();

      // Step 1: Create new customers
      for (const newCustomer of newCustomers) {
        const { tempId, ...customerWithoutTempId } = newCustomer;
        const result = await addCustomer(customerWithoutTempId);
        if (result.success && result.data) {
          const addressKey = tempId || "";
          customerIdMap.set(addressKey, result.data.id);
        } else {
          message.error(`Failed to create customer: ${result.error || "Unknown error"}`);
        }
      }

      // Step 2: Update orders with new customer IDs and create them
      let successCount = 0;
      for (const order of processedOrders) {
        if (order.customerId === 0) {
          // This order needs a new customer ID
          const addressKey = `${order.detailedAddress}|${order.area || ""}|${order.district || ""}`;
          const newCustomerId = customerIdMap.get(addressKey);
          if (newCustomerId) {
            order.customerId = newCustomerId;
          } else {
            // Skip this order if customer creation failed
            continue;
          }
        }

        await createOrder(order);
        successCount++;
      }

      message.success(
        `Successfully created ${newCustomers.length} customer(s) and ${successCount} order(s)`
      );
      onUploadComplete();
      handleClose();
    } catch (err) {
      message.error(`Error creating records: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const props: UploadProps = {
    name: "file",
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      const isJson =
        file.type === "application/json" || file.name.endsWith(".json");
      const isCsv = file.type === "text/csv" || file.name.endsWith(".csv");

      if (!isJson && !isCsv) {
        message.error("Only JSON and CSV files are allowed");
        return Upload.LIST_IGNORE;
      }

      setSelectedFile(file);
      message.success("File selected, please click the upload button");
      return Upload.LIST_IGNORE;
    },
  };

  return (
    <>
      <Modal
        title="Upload JSON/CSV File"
        open={isOpen && !showPreview}
        onCancel={handleClose}
        footer={[
          <Button key="cancel" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>,
          <Button
            key="upload"
            type="primary"
            onClick={handleUpload}
            disabled={!selectedFile || isProcessing}
            loading={isProcessing}
          >
            Upload
          </Button>,
        ]}
        destroyOnClose
      >
        <Dragger {...props}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag JSON/CSV file to this area to upload
          </p>
          <p className="ant-upload-hint">
            Upload a JSON or CSV file to import orders in bulk.
          </p>
        </Dragger>
        {selectedFile && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <p style={{ color: "#52c41a" }}>
              Selected file: {selectedFile.name}
            </p>
          </div>
        )}
      </Modal>
      <UploadPreviewModal
        isOpen={showPreview}
        newCustomers={newCustomers}
        ordersCount={processedOrders.length}
        failedAddresses={failedAddresses}
        onConfirm={confirmUpload}
        onCancel={() => setShowPreview(false)}
        loading={isCreating}
      />
    </>
  );
};

export default JsonUploadModal;
