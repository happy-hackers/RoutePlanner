import { Card, Button, Space, Typography, Tag } from 'antd';
import { CheckOutlined, UnorderedListOutlined, UndoOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { AddressMetersElement } from '../../types/route';

const { Title, Text } = Typography;

interface NextStopCardProps {
  stop: AddressMetersElement;
  stopNumber: number;
  totalStops: number;
  segmentTime: number;
  onDone: () => void;
  onUndo: () => void;
  onViewAll: () => void;
}

export default function NextStopCard({
  stop,
  stopNumber,
  totalStops,
  segmentTime,
  onDone,
  onUndo,
  onViewAll
}: NextStopCardProps) {
  const { t } = useTranslation('viewDriverRoute');
  const keyPath = "nextStopCard";
  const isCompleted = stop.meters.every(order => order.status === 'Delivered');

  return (
    <Card
      id="next-stop-card"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Header */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: 16 }}>
            {isCompleted
              ? t(`${keyPath}.header_completed`)
              : t(`${keyPath}.header_next`)}
            : {t(`${keyPath}.text_stop`, { stopNumber })} {t(`${keyPath}.text_of`)} {totalStops}
          </Text>
          <Tag color={isCompleted ? 'success' : 'processing'}>
            {isCompleted ? t(`${keyPath}.tag_done`) : t(`${keyPath}.tag_in_progress`)}
          </Tag>
        </Space>

        {/* Customer & Address */}
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {stop.meters[0].customer?.name || t(`${keyPath}.placeholder_customer`)}
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            {stop.address}, {stop.area}
          </Text>
        </div>

        {/* Time & Customer Hours */}
        <Space>
          <Text strong style={{ color: '#52c41a' }}>
            {t(`${keyPath}.text_time_mins`, { segmentTime })}
          </Text>
          {stop.meters[0].customer?.openTime && (
            <Text type="secondary">
              {t(`${keyPath}.text_open`)}: {stop.meters[0].customer.openTime} - {stop.meters[0].customer.closeTime}
            </Text>
          )}
        </Space>

        {/* Action Buttons */}
        <Space style={{ width: '100%' }}>
          <Button
            size="large"
            icon={<UnorderedListOutlined />}
            onClick={onViewAll}
            style={{ flex: 1 }}
          >
            {t(`${keyPath}.button_view_all`)}
          </Button>
          {isCompleted ? (
            <Button
              size="large"
              icon={<UndoOutlined />}
              onClick={onUndo}
              style={{ flex: 2, height: 56 }}
            >
              {t(`${keyPath}.button_undo`)}
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<CheckOutlined />}
              onClick={onDone}
              style={{ flex: 2, height: 56 }}
            >
              {t(`${keyPath}.button_mark_done`)}
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
}