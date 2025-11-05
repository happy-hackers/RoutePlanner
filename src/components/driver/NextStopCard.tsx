import { Card, Button, Space, Typography, Tag } from 'antd';
import { CheckOutlined, UnorderedListOutlined, UndoOutlined } from '@ant-design/icons';
import type { Order } from '../../types/order';

const { Title, Text } = Typography;

interface NextStopCardProps {
  order: Order;
  stopNumber: number;
  totalStops: number;
  segmentTime: number;
  onDone: () => void;
  onUndo: () => void;
  onViewAll: () => void;
}

export default function NextStopCard({
  order,
  stopNumber,
  totalStops,
  segmentTime,
  onDone,
  onUndo,
  onViewAll
}: NextStopCardProps) {
  const isCompleted = order.status === 'Delivered';

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
            {isCompleted ? 'Completed' : 'Next'}: Stop {stopNumber} of {totalStops}
          </Text>
          <Tag color={isCompleted ? 'success' : 'processing'}>
            {isCompleted ? 'DONE' : 'IN PROGRESS'}
          </Tag>
        </Space>

        {/* Customer & Address */}
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {order.customer?.name || 'Customer'}
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            {order.detailedAddress}, {order.area}
          </Text>
        </div>

        {/* Time & Customer Hours */}
        <Space>
          <Text strong style={{ color: '#52c41a' }}>
            {segmentTime} mins
          </Text>
          {order.customer?.openTime && (
            <Text type="secondary">
              Open: {order.customer.openTime} - {order.customer.closeTime}
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
            View All
          </Button>
          {isCompleted ? (
            <Button
              size="large"
              icon={<UndoOutlined />}
              onClick={onUndo}
              style={{ flex: 2, height: 56 }}
            >
              Undo
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<CheckOutlined />}
              onClick={onDone}
              style={{ flex: 2, height: 56 }}
            >
              Mark as Done
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
}
