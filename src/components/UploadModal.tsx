import React, { useState } from "react";
import { Modal, Button, message, Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { createOrder } from "../utils/dbUtils";
import type { Order } from "../types/order";

const { Dragger } = Upload;

const JsonUploadModal: React.FC = () => {
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
        const result = JSON.parse(e.target?.result as string);
        result.forEach((order: Order) => {
          createOrder(order);
        });
        //console.log("File uploaded successfully");
        message.success("File uploaded successfully");
        handleClose();
      } catch (err) {
        message.error(err as string);
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
      if (!isJson) {
        alert("Only JSON files are allowed");
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
        Bulk Import Orders (Upload JSON)
      </Button>

      <Modal
        title="Upload JSON File"
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
            Click or drag JSON file to this area to upload
          </p>
          <p className="ant-upload-hint">
            Upload a JSON file to import orders in bulk.
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
