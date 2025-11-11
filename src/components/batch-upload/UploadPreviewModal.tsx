import { Modal, Button, Table, Alert, Space, Typography } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import type { Customer } from "../../types/customer";
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

export interface NewCustomerData extends Omit<Customer, "id"> {
  tempId?: string; // Temporary ID for tracking
}

interface UploadPreviewModalProps {
  isOpen: boolean;
  newCustomers: NewCustomerData[];
  ordersCount: number;
  failedAddresses: { address: string; error: string }[];
  ordersWithDefaults?: {
    orderId: number;
    usedDefaultDate: boolean;
    usedDefaultTime: boolean;
  }[];
  invalidDateFormats?: {
    orderId: number;
    originalDate: string;
    rowNumber: number;
  }[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function UploadPreviewModal({
  isOpen,
  newCustomers,
  ordersCount,
  failedAddresses,
  ordersWithDefaults = [],
  invalidDateFormats = [],
  onConfirm,
  onCancel,
  loading = false,
}: UploadPreviewModalProps) {
  const { t } = useTranslation('uploadComponent');
  const keyPath = "uploadPreview";

  const columns = [
    {
      title: t(`${keyPath}.col_customer_name`),
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: t(`${keyPath}.col_detailed_address`),
      dataIndex: "detailedAddress",
      key: "detailedAddress",
      ellipsis: true,
    },
    {
      title: t(`${keyPath}.col_area`),
      dataIndex: "area",
      key: "area",
      width: 150,
    },
    {
      title: t(`${keyPath}.col_district`),
      dataIndex: "district",
      key: "district",
      width: 150,
    },
    {
      title: t(`${keyPath}.col_open_time`),
      dataIndex: "openTime",
      key: "openTime",
      width: 100,
    },
    {
      title: t(`${keyPath}.col_close_time`),
      dataIndex: "closeTime",
      key: "closeTime",
      width: 100,
    },
  ];

  return (
    <Modal
      title={t(`${keyPath}.modal_title`)}
      open={isOpen}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          {t(`${keyPath}.button_cancel`)}
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={onConfirm}
          loading={loading}
          disabled={newCustomers.length === 0 && ordersCount === 0}
        >
          {t(`${keyPath}.button_confirm_create`)}
        </Button>,
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Summary */}
        <div>
          <Title level={5}>{t(`${keyPath}.summary_title`)}</Title>
          <Text>
            <strong>{newCustomers.length}</strong>{" "}
            {t(`${keyPath}.summary_new_customer_text`, { count: newCustomers.length })}
          </Text>
          <br />
          <Text>
            <strong>{ordersCount}</strong> {t(`${keyPath}.summary_order_import_text`, { count: ordersCount })}
          </Text>
        </div>

        {/* Failed Addresses Warning */}
        {failedAddresses.length > 0 && (
          <Alert
            message={t(`${keyPath}.alert_geocode_failure_title`)}
            description={
              <div>
                <Text>
                  {t(`${keyPath}.alert_geocode_failure_desc_part1`, {
                    count: failedAddresses.length,
                  })}
                </Text>
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  {failedAddresses.map((failed, index) => (
                    <li key={index}>
                      <Text strong>{failed.address}</Text> -{" "}
                      <Text type="danger">{failed.error}</Text>
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

        {/* Invalid Date Format Warning */}
        {invalidDateFormats.length > 0 && (
          <Alert
            message={t(`${keyPath}.alert_invalid_date_title`)}
            description={
              <div>
                <Text>
                  {t(`${keyPath}.alert_invalid_date_desc_part1`, {
                    count: invalidDateFormats.length,
                  })}
                </Text>
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  {invalidDateFormats.map((invalid, index) => (
                    <li key={index}>
                      <Text strong>
                        {t(`${keyPath}.text_row`, { rowNumber: invalid.rowNumber })}
                      </Text>
                      {invalid.orderId > 0 && (
                        <Text>
                          {t(`${keyPath}.text_order_id`, { orderId: invalid.orderId })}
                        </Text>
                      )}
                      <Text> {t(`${keyPath}.text_invalid_format`)} </Text>
                      <Text type="danger" code>
                        {invalid.originalDate}
                      </Text>
                    </li>
                  ))}
                </ul>
              </div>
            }
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
          />
        )}

        {/* New Customers Table */}
        {newCustomers.length > 0 && (
          <div>
            <Title level={5}>
              {t(`${keyPath}.table_new_customers_title`)}
            </Title>
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

        {/* Orders with Default Values */}
        {ordersWithDefaults.length > 0 && (
          <Alert
            message={t(`${keyPath}.alert_auto_fill_title`, {
              count: ordersWithDefaults.length,
            })}
            description={
              <div>
                <Text>
                  {t(`${keyPath}.alert_auto_fill_desc_part1`)}
                </Text>
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  {ordersWithDefaults.map((defaultInfo, index) => (
                    <li key={index}>
                      <Text strong>
                        {t(`${keyPath}.text_order`, { orderId: defaultInfo.orderId })}
                      </Text>{" "}
                      -
                      {defaultInfo.usedDefaultDate && (
                        <Text> {t(`${keyPath}.text_used_default_date`)}</Text>
                      )}
                      {defaultInfo.usedDefaultDate &&
                        defaultInfo.usedDefaultTime && <Text>, </Text>}
                      {defaultInfo.usedDefaultTime && (
                        <Text> {t(`${keyPath}.text_used_default_time`)}</Text>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            }
            type="info"
            showIcon
          />
        )}

        {/* No Data Warning */}
        {newCustomers.length === 0 && ordersCount === 0 && (
          <Alert
            message={t(`${keyPath}.alert_no_data_title`)}
            description={t(`${keyPath}.alert_no_data_desc`)}
            type="error"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
}

export default UploadPreviewModal;
