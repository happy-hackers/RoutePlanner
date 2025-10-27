import { Modal, Button, Table, Alert, Space, Typography } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import type { Customer } from "../types/customer";

const { Title, Text } = Typography;

export interface NewCustomerData extends Omit<Customer, "id"> {
  tempId?: string; // Temporary ID for tracking
}

interface UploadPreviewModalProps {
  isOpen: boolean;
  newCustomers: NewCustomerData[];
  ordersCount: number;
  failedAddresses: { address: string; error: string }[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function UploadPreviewModal({
  isOpen,
  newCustomers,
  ordersCount,
  failedAddresses,
  onConfirm,
  onCancel,
  loading = false,
}: UploadPreviewModalProps) {
  const columns = [
    {
      title: "Customer Name",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "Detailed Address",
      dataIndex: "detailedAddress",
      key: "detailedAddress",
      ellipsis: true,
    },
    {
      title: "Area",
      dataIndex: "area",
      key: "area",
      width: 150,
    },
    {
      title: "District",
      dataIndex: "district",
      key: "district",
      width: 150,
    },
    {
      title: "Open Time",
      dataIndex: "openTime",
      key: "openTime",
      width: 100,
    },
    {
      title: "Close Time",
      dataIndex: "closeTime",
      key: "closeTime",
      width: 100,
    },
  ];

  return (
    <Modal
      title="Preview Batch Upload"
      open={isOpen}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={onConfirm}
          loading={loading}
          disabled={newCustomers.length === 0 && ordersCount === 0}
        >
          Confirm & Create
        </Button>,
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Summary */}
        <div>
          <Title level={5}>Summary</Title>
          <Text>
            <strong>{newCustomers.length}</strong> new customer(s) will be created
          </Text>
          <br />
          <Text>
            <strong>{ordersCount}</strong> order(s) will be imported
          </Text>
        </div>

        {/* Failed Addresses Warning */}
        {failedAddresses.length > 0 && (
          <Alert
            message="Geocoding Failures"
            description={
              <div>
                <Text>
                  The following {failedAddresses.length} address(es) failed geocoding and will be skipped:
                </Text>
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  {failedAddresses.map((failed, index) => (
                    <li key={index}>
                      <Text strong>{failed.address}</Text> - <Text type="danger">{failed.error}</Text>
                    </li>
                  ))}
                </ul>
              </div>
            }
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
          />
        )}

        {/* New Customers Table */}
        {newCustomers.length > 0 && (
          <div>
            <Title level={5}>New Customers to be Created</Title>
            <Table
              columns={columns}
              dataSource={newCustomers}
              rowKey={(record) => record.tempId || record.detailedAddress}
              pagination={false}
              scroll={{ y: 300 }}
              size="small"
            />
          </div>
        )}

        {/* No Data Warning */}
        {newCustomers.length === 0 && ordersCount === 0 && (
          <Alert
            message="No Valid Data"
            description="No customers or orders can be created from the uploaded file."
            type="error"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
}

export default UploadPreviewModal;
