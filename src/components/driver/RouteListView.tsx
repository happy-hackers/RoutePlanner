import { List, Space, Typography, Tag, Progress, Button } from 'antd';
import { CheckCircleFilled, ClockCircleOutlined, UndoOutlined } from '@ant-design/icons';
import type { Order } from '../../types/order';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface RouteListViewProps {
  orders: Order[];
  segmentTimes: number[];
  currentStopIndex: number;
  onStopSelect: (index: number) => void;
  onUndo: () => void;
}

export default function RouteListView({
  orders,
  segmentTimes,
  currentStopIndex,
  onStopSelect,
  onUndo
}: RouteListViewProps) {
  const { t } = useTranslation('driverRouteComponent');
  const keyPath = "routeListView";
  const completedCount = orders.filter(o => o.status === 'Delivered').length;
  const progressPercent = (completedCount / orders.length) * 100;
  const nextIncompleteIndex = orders.findIndex(o => o.status !== 'Delivered');

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {/* Progress Header */}
      <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 18 }}>
          {t(`${keyPath}.progress_header_text`)}: {completedCount} {t(`${keyPath}.progress_header_of`)} {orders.length} {t(`${keyPath}.progress_header_completed`)}
        </Text>
        <Progress percent={Math.round(progressPercent)} status="active" />
      </Space>

      {/* Stop List */}
      <List
        dataSource={orders}
        renderItem={(order, index) => {
          const isCompleted = order.status === 'Delivered';
          const isNext = index === nextIncompleteIndex;
          const isCurrent = index === currentStopIndex;

          return (
            <List.Item
              onClick={() => onStopSelect(index)}
              className={isCurrent ? 'route-item-selected' : ''}
              style={{
                cursor: 'pointer',
                padding: '16px',
                backgroundColor: isCurrent ? '#e6f7ff' : 'transparent',
                border: isCurrent ? 'none' : '1px solid #f0f0f0',
                borderRadius: 8,
                marginBottom: 8,
                opacity: isCompleted ? 0.6 : 1,
                minHeight: 80,
              }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }} size="middle">
                <Space size="middle" style={{ flex: 1 }}>
                  {/* Status Icon */}
                  <div style={{ fontSize: 24 }}>
                    {isCompleted ? (
                      <CheckCircleFilled style={{ color: '#52c41a' }} />
                    ) : isNext ? (
                      <ClockCircleOutlined style={{ color: '#1890ff' }} />
                    ) : (
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: '2px solid #d9d9d9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        color: '#8c8c8c'
                      }}>
                        {index + 1}
                      </div>
                    )}
                  </div>

                  {/* Stop Details */}
                  <Space direction="vertical" size="small" style={{ flex: 1 }}>
                    <Text
                      strong
                      delete={isCompleted}
                      style={{ fontSize: 16 }}
                    >
                      {index + 1}. {order.customer?.name || t(`${keyPath}.placeholder_customer`)}
                    </Text>
                    <Text
                      type="secondary"
                      delete={isCompleted}
                    >
                      {order.detailedAddress}
                    </Text>
                    <Space>
                      <Text strong style={{ color: '#52c41a' }}>
                        {t(`${keyPath}.text_time_mins`, { segmentTime: segmentTimes[index] || 0 })}
                      </Text>
                      {isNext && <Tag color="blue">{t(`${keyPath}.tag_next`)}</Tag>}
                      {isCompleted && <Tag color="success">{t(`${keyPath}.tag_done`)}</Tag>}
                      {order.customer?.openTime && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {order.customer.openTime}-{order.customer.closeTime}
                        </Text>
                      )}
                    </Space>
                  </Space>
                </Space>

                {/* Undo Button for completed items */}
                {isCompleted && isCurrent && (
                  <Button
                    icon={<UndoOutlined />}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering onStopSelect
                      onUndo();
                    }}
                    size="small"
                  >
                    {t(`${keyPath}.button_undo`)}
                  </Button>
                )}
              </Space>
            </List.Item>
          );
        }}
      />
    </div>
  );
}