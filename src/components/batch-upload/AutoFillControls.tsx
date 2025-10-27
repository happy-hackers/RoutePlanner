import { Alert } from "antd";

export default function UploadInstructions() {
  return (
    <Alert
      message="Upload Instructions"
      description="Upload a JSON or CSV file to import orders in bulk. Missing date/time data will be automatically filled with current Hong Kong date/time."
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
    />
  );
}