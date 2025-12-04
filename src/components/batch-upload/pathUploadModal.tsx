import { useState, useRef, useEffect } from "react";
import {
  Modal,
  Button,
  App,
  List,
  Typography,
  Alert,
  Divider,
  Space,
} from "antd";
import Papa from "papaparse";
import FileUploader from "./FileUploader";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

interface PathUploadModalProps {
  isOpen: boolean;
  setOpen: (v: boolean) => void;
}

const { Text } = Typography;

export default function PathUploadModal({
  isOpen,
  setOpen,
}: PathUploadModalProps) {
  const { message } = App.useApp();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [validatedCoords, setValidatedCoords] = useState<
    { address: string; lat: number; lng: number }[]
  >([]);
  const [invalidAddresses, setInvalidAddresses] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

  useEffect(() => {
    async function initGoogleService() {
      try {
        setOptions({
          key: GOOGLE_API_KEY,
        });
        const { Geocoder } = (await importLibrary(
          "geocoding"
        )) as google.maps.GeocodingLibrary;
        geocoderRef.current = new Geocoder();
      } catch (err) {
        console.error("Failed to load Google Maps:", err);
        message.error("Google Maps API failed to load");
      }
    }
    initGoogleService();
  }, [GOOGLE_API_KEY]);

  useEffect(() => {
    if (isOpen) {
      // Clear all previous data whenever the modal is newly opened
      setSelectedFile(null);
      setAddresses([]);
      setValidatedCoords([]);
      setInvalidAddresses([]);
    }
  }, [isOpen]);

  // --- Geocoding Helper ---
  const geocodeAddress = (
    address: string
  ): Promise<{ lat: number; lng: number }> =>
    new Promise((resolve, reject) => {
      geocoderRef.current?.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results?.length) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          reject(address);
        }
      });
    });

  // --- Parse CSV and Validate Immediately ---
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setAddresses([]);
    setValidatedCoords([]);
    setInvalidAddresses([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      const { data } = Papa.parse<{ address: string }>(csvText.trim(), {
        header: true,
        skipEmptyLines: true,
      });

      const parsed = data.map((r) => r.address).filter(Boolean);
      setAddresses(parsed);

      if (parsed.length === 0)
        return message.error("No valid addresses found in CSV");

      setIsProcessing(true);
      message.info(`Validating ${parsed.length} addresses...`);

      const valid: { address: string; lat: number; lng: number }[] = [];
      const invalid: string[] = [];

      for (const addr of parsed) {
        try {
          const loc = await geocodeAddress(addr);
          valid.push({ address: addr, lat: loc.lat, lng: loc.lng });
          await new Promise((r) => setTimeout(r, 150)); // avoid hitting rate limit
        } catch {
          invalid.push(addr);
        }
      }

      setValidatedCoords(valid);
      setInvalidAddresses(invalid);
      setIsProcessing(false);

      if (invalid.length > 0) {
        message.error(
          `Some addresses could not be geocoded (${invalid.length})`
        );
      } else {
        message.success("All addresses validated successfully!");
      }
    };

    reader.readAsText(file);
  };

  // --- Upload to backend ---
  const handleUpload = async () => {
    if (!addresses.length) return message.error("No addresses to upload");
    if (invalidAddresses.length > 0)
      return message.error("Please fix invalid addresses first");

    setIsProcessing(true);

    try {
      const res = await fetch("http://localhost:8000/upload-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coords: validatedCoords }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        console.error("Backend error:", result.error || res.statusText);
        return message.error(result.error || "Backend processing failed");
      }

      message.success(result.message || "Path information stored in Supabase!");
      setOpen(false);
    } catch (err) {
      console.error(err);
      message.error("Unexpected error while processing");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      title="Upload Address CSV"
      open={isOpen}
      onCancel={() => setOpen(false)}
      width={600}
      footer={[
        <Button
          key="cancel"
          onClick={() => setOpen(false)}
          disabled={isProcessing}
        >
          Cancel
        </Button>,
        <Button
          key="upload"
          type="primary"
          onClick={handleUpload}
          disabled={
            !selectedFile ||
            isProcessing ||
            invalidAddresses.length > 0 ||
            validatedCoords.length === 0
          }
          loading={isProcessing}
        >
          Upload
        </Button>,
      ]}
    >
      <p>
        Upload a CSV with a column named <code>address</code>, e.g.:
      </p>
      <pre style={{ background: "#f6f6f6", padding: "8px" }}>
        address{"\n"}Shop 10C-10G, G/F United Building, 1-7 Wu Kwong Street,
        Hung Hom, Kowloon{"\n"}Shop F, 1/F, Planet Square, 1-15 Tak Man Street,
        Hung Hom, Kowloon
      </pre>

      <FileUploader
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
      />

      {addresses.length > 0 && (
        <>
          <Divider />
          <Space direction="vertical" style={{ width: "100%" }}>
            {validatedCoords.length > 0 && (
              <Alert
                message={`${validatedCoords.length} valid addresses`}
                type="success"
                showIcon
              />
            )}
            {invalidAddresses.length > 0 && (
              <Alert
                message={`${invalidAddresses.length} invalid addresses`}
                description="Some addresses could not be geocoded. Please correct them before uploading."
                type="error"
                showIcon
              />
            )}
          </Space>
        </>
      )}

      {invalidAddresses.length > 0 && (
        <>
          <Divider orientation="left">Invalid Addresses</Divider>
          <List
            bordered
            dataSource={invalidAddresses}
            size="small"
            renderItem={(item) => (
              <List.Item>
                <Text type="danger">❌ {item}</Text>
              </List.Item>
            )}
            style={{ maxHeight: 150, overflowY: "auto" }}
          />
        </>
      )}

      {validatedCoords.length > 0 && (
        <>
          <Divider orientation="left">Valid Addresses</Divider>
          <List
            bordered
            dataSource={validatedCoords}
            size="small"
            renderItem={(item) => (
              <List.Item>
                <Text type="success">{item.address}</Text>
              </List.Item>
            )}
            style={{ maxHeight: 150, overflowY: "auto" }}
          />
        </>
      )}
    </Modal>
  );
}
