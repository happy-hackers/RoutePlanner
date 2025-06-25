import React, { useState } from "react";
import { Modal, Button, Upload, App } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { createOrder } from "../utils/dbUtils";
import type { Order } from "../types/order";

const { Dragger } = Upload;

const parseCSV = (csvText: string): Order[] => {
  const lines = csvText.trim().split("\n");
  const headers = parseCSVLine(lines[0]);

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
        case "state":
          order.state = value as
            | "Pending"
            | "Assigned"
            | "In Progress"
            | "Delivered"
            | "Cancelled";
          break;
        case "address":
          order.address = value;
          break;
        case "lat":
          order.lat = parseFloat(value) || 0;
          break;
        case "lng":
          order.lng = parseFloat(value) || 0;
          break;
        case "postcode":
          order.postcode = parseInt(value) || 0;
          break;
        case "dispatcherid":
          order.dispatcherId = parseInt(value) || undefined;
          break;
        default:
          break;
      }
    });

    if (
      order.date &&
      order.address &&
      order.lat &&
      order.lng &&
      order.postcode
    ) {
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

const JsonUploadModal: React.FC = () => {
  const { message } = App.useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleOpen = () => setIsModalOpen(true);
  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      message.error("Please select a file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string;
        let orders: Order[] = [];

        if (
          selectedFile.type === "application/json" ||
          selectedFile.name.endsWith(".json")
        ) {
          //json
          const result = JSON.parse(fileContent);
          orders = Array.isArray(result) ? result : [result];
        } else if (
          selectedFile.type === "text/csv" ||
          selectedFile.name.endsWith(".csv")
        ) {
          // csv
          orders = parseCSV(fileContent);
        }

        // validate
        const validOrders = orders.filter((order) => {
          return (
            order.date &&
            order.address &&
            order.lat &&
            order.lng &&
            order.postcode
          );
        });

        if (validOrders.length === 0) {
          message.error("No valid orders found in the file");
          return;
        }

        // create orders
        validOrders.forEach((order: Order) => {
          createOrder(order);
        });

        message.success(`Successfully uploaded ${validOrders.length} orders`);
        handleClose();
      } catch (err) {
        message.error(
          `Error processing file: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    };
    reader.readAsText(selectedFile);
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
      <Button type="primary" onClick={handleOpen}>
        Bulk Import Orders (Upload JSON/CSV)
      </Button>

      <Modal
        title="Upload JSON/CSV File"
        open={isModalOpen}
        onCancel={handleClose}
        footer={[
          <Button key="cancel" onClick={handleClose}>
            Cancel
          </Button>,
          <Button
            key="upload"
            type="primary"
            onClick={handleUpload}
            disabled={!selectedFile}
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
    </>
  );
};

export default JsonUploadModal;
