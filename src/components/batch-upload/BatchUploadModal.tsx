import { useState, useRef, useEffect } from "react";
import { Modal, Button, App } from "antd";
import { createOrder, addCustomer } from "../../utils/dbUtils";
import type { Order } from "../../types/order";
import UploadPreviewModal, { type NewCustomerData } from "./UploadPreviewModal";
import type { TimePeriod } from "../../store/orderSlice";
import { getCurrentTimePeriod, getCurrentDateHK } from "../../utils/timeUtils";
import { useTranslation } from 'react-i18next';

import UploadInstructions from "./AutoFillControls";
import FileUploader from "./FileUploader";
import { parseCSV } from "./utils/csvParser";
import { OrderProcessor } from "./utils/OrderProcessor";

interface BatchUploadModalProps {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onUploadComplete: () => void;
}

export default function BatchUploadModal({
  isOpen,
  setOpen,
  onUploadComplete,
}: BatchUploadModalProps) {
  const { t } = useTranslation('upload'); 
  const keyPath = "batchUploadModel";
  const { message } = App.useApp();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [newCustomers, setNewCustomers] = useState<NewCustomerData[]>([]);
  const [processedOrders, setProcessedOrders] = useState<Omit<Order, "id">[]>(
    []
  );
  const [failedAddresses, setFailedAddresses] = useState<
    { address: string; error: string }[]
  >([]);
  const [ordersWithDefaults, setOrdersWithDefaults] = useState<
    { orderId: number; usedDefaultDate: boolean; usedDefaultTime: boolean }[]
  >([]);
  const [invalidDateFormats, setInvalidDateFormats] = useState<
    { orderId: number; originalDate: string; rowNumber: number }[]
  >([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Default values for auto-fill (always enabled)
  const [defaultDate, setDefaultDate] = useState(getCurrentDateHK());
  const [defaultTimePeriod, setDefaultTimePeriod] = useState<TimePeriod>(
    getCurrentTimePeriod()
  );

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
    setOrdersWithDefaults([]);
    setInvalidDateFormats([]);
    setIsProcessing(false);
    setDefaultDate(getCurrentDateHK());
    setDefaultTimePeriod(getCurrentTimePeriod());
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      message.error(t(`${keyPath}.error_select_file`));
      return;
    }

    if (!geocoderRef.current) {
      message.error(t(`${keyPath}.error_maps_not_loaded`));
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
          const fallbackDate = defaultDate.format("YYYY-MM-DD");
          const fallbackTime = defaultTimePeriod;
          const csvResult = parseCSV(fileContent, fallbackDate, fallbackTime);
          orders = csvResult.orders;
          setOrdersWithDefaults(csvResult.usedDefaults);
          setInvalidDateFormats(csvResult.invalidDateFormats);
        }

        // validate basic fields
        const validOrders = orders.filter((order) => {
          return (
            order.date &&
            order.time &&
            (order.customerId || order.detailedAddress)
          );
        });

        if (validOrders.length === 0) {
          message.error(t(`${keyPath}.error_no_valid_orders`));
          return;
        }

        if (!geocoderRef.current) {
          message.error(t(`${keyPath}.error_geocoder_not_available`));
          return;
        }

        const processor = new OrderProcessor(geocoderRef.current);
        const result = await processor.processOrders(validOrders);

        setNewCustomers(result.customersToCreate);
        setProcessedOrders(result.ordersToCreate);
        setFailedAddresses(result.failed);
        setShowPreview(true);
      } catch (err) {
        message.error(
          t(`${keyPath}.error_processing_file`, {
            error: err instanceof Error ? err.message : t('common.unknown_error', { ns: 'common' })
          })
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
          message.error(
            t(`${keyPath}.error_create_customer`, {
              error: result.error || t('common.unknown_error', { ns: 'common' })
            })
          );
        }
      }

      // Step 2: Update orders with new customer IDs and create them
      let successCount = 0;
      for (const order of processedOrders) {
        if (order.customerId === 0) {
          const addressKey = `${order.detailedAddress}|${order.area || ""}|${order.district || ""
            }`;
          const newCustomerId = customerIdMap.get(addressKey);
          if (newCustomerId) {
            order.customerId = newCustomerId;
          } else {
            continue;
          }
        }

        await createOrder(order);
        successCount++;
      }

      message.success(
        t(`${keyPath}.success_upload`, {
          customerCount: newCustomers.length,
          orderCount: successCount
        })
      );
      onUploadComplete();
      handleClose();
    } catch (err) {
      message.error(
        t(`${keyPath}.error_creating_records`, {
          error: err instanceof Error ? err.message : t('common.unknown_error', { ns: 'common' })
        })
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Modal
        title={t(`${keyPath}.modal_title`)}
        open={isOpen && !showPreview}
        onCancel={handleClose}
        footer={[
          <Button key="cancel" onClick={handleClose} disabled={isProcessing}>
            {t(`${keyPath}.button_cancel`)}
          </Button>,
          <Button
            key="upload"
            type="primary"
            onClick={handleUpload}
            disabled={!selectedFile || isProcessing}
            loading={isProcessing}
          >
            {t(`${keyPath}.button_upload`)}
          </Button>,
        ]}
      >
        <UploadInstructions />

        <FileUploader
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />
      </Modal>

      <UploadPreviewModal
        isOpen={showPreview}
        newCustomers={newCustomers}
        ordersCount={processedOrders.length}
        failedAddresses={failedAddresses}
        ordersWithDefaults={ordersWithDefaults}
        invalidDateFormats={invalidDateFormats}
        onConfirm={confirmUpload}
        onCancel={() => setShowPreview(false)}
        loading={isCreating}
      />
    </>
  );
}