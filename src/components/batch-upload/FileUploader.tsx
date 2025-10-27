import { Upload, App } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";

const { Dragger } = Upload;

interface FileUploaderProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
}

export default function FileUploader({ selectedFile, onFileSelect }: FileUploaderProps) {
  const { message } = App.useApp();

  const props: UploadProps = {
    name: "file",
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      const isJson = file.type === "application/json" || file.name.endsWith(".json");
      const isCsv = file.type === "text/csv" || file.name.endsWith(".csv");

      if (!isJson && !isCsv) {
        message.error("Only JSON and CSV files are allowed");
        return Upload.LIST_IGNORE;
      }

      onFileSelect(file);
      message.success("File selected, please click the upload button");
      return Upload.LIST_IGNORE;
    },
  };

  return (
    <>
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
    </>
  );
}