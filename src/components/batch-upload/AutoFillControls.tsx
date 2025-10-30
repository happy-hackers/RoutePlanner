import { Alert } from "antd";

export default function UploadInstructions() {
  return (
    <Alert
      message="Upload Instructions"
      description={
        <div>
          <p>Upload a JSON or CSV file to import orders in bulk. Missing date/time data will be automatically filled with current Hong Kong date/time.</p>
          <p style={{ marginTop: 8, marginBottom: 0 }}>
            <strong>Date Format:</strong> Dates must be in <strong>YYYY-MM-DD</strong> format (e.g., 2025-01-20). Other formats will be rejected.
          </p>
        </div>
      }
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
    />
  );
}