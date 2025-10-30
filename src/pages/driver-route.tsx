import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Button, message, Spin, Result, DatePicker, Typography } from 'antd';
import { EnvironmentOutlined, LogoutOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import NextStopCard from '../components/driver/NextStopCard';
import RouteListView from '../components/driver/RouteListView';
import DriverMap from '../components/driver/DriverMap';
import { getDriverActiveRoute, updateOrderStatus } from '../utils/dbUtils';
import { generateGoogleMapsUrl, getNextIncompleteStopIndex } from '../utils/mapUtils';
import { logoutDriver } from '../utils/authUtils';
import { useAuth } from '../contexts/AuthContext';
import type { DeliveryRoute } from '../types/delivery-route';
import type { Order } from '../types/order';

const { Header, Content } = Layout;
const { Title } = Typography;

type ViewMode = 'next' | 'list';

export default function DriverRoute() {
  const navigate = useNavigate();
  const { user, dispatcher, loading: authLoading } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [deliveryRoute, setDeliveryRoute] = useState<DeliveryRoute | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('next');
  const [selectedDate, setSelectedDate] = useState(dayjs());

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/driver-login');
    }
  }, [user, authLoading, navigate]);

  // Fetch route data
  const fetchRouteData = async (date: string) => {
    if (!dispatcher) {
      return;
    }

    try {
      setLoading(true);

      // Get active route (orderSequence already contains full Order objects)
      const routeData = await getDriverActiveRoute(dispatcher.id, date);

      if (!routeData) {
        setDeliveryRoute(null);
        setOrders([]);
        return;
      }

      setDeliveryRoute(routeData);

      // Orders are already in the route's orderSequence
      setOrders(routeData.orderSequence);

      // Set current stop to first incomplete
      const firstIncomplete = routeData.orderSequence.findIndex(o => o.status !== 'Delivered');
      setCurrentStopIndex(firstIncomplete !== -1 ? firstIncomplete : 0);

    } catch (error) {
      message.error('Failed to load route');
    } finally {
      setLoading(false);
    }
  };

  // Load route on mount and date change
  useEffect(() => {
    if (dispatcher) {
      fetchRouteData(selectedDate.format('YYYY-MM-DD'));
    }
  }, [dispatcher, selectedDate]);

  // Handle mark as done
  const handleDone = async () => {
    const currentOrder = orders[currentStopIndex];

    try {
      // Update database
      await updateOrderStatus(currentOrder.id, 'Delivered');

      // Update local state
      setOrders(prev => prev.map(o =>
        o.id === currentOrder.id ? { ...o, status: 'Delivered' as const } : o
      ));

      message.success('Delivery marked as complete!');

      // Auto-advance to next incomplete stop
      const nextIndex = getNextIncompleteStopIndex(orders, currentStopIndex);

      if (nextIndex !== -1) {
        setCurrentStopIndex(nextIndex);
      } else {
        // All done!
        message.success('All deliveries completed!');
      }

    } catch (error) {
      message.error('Failed to update delivery status');
    }
  };

  // Handle undo (revert delivered status)
  const handleUndo = async () => {
    const currentOrder = orders[currentStopIndex];

    // Only allow undo for delivered orders
    if (currentOrder.status !== 'Delivered') {
      message.warning('This delivery has not been marked as complete yet');
      return;
    }

    try {
      // Update database back to In Progress
      await updateOrderStatus(currentOrder.id, 'In Progress');

      // Update local state
      setOrders(prev => prev.map(o =>
        o.id === currentOrder.id ? { ...o, status: 'In Progress' as const } : o
      ));

      message.success('Delivery status reverted to In Progress');

    } catch (error) {
      message.error('Failed to revert delivery status');
    }
  };

  // Handle stop selection from list
  const handleStopSelect = (index: number) => {
    setCurrentStopIndex(index);
    setViewMode('next');
  };

  // Open Google Maps
  const handleOpenGoogleMaps = () => {
    if (deliveryRoute && orders.length > 0) {
      const url = generateGoogleMapsUrl(deliveryRoute, orders);
      window.open(url, '_blank');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    const result = await logoutDriver();
    if (result.success) {
      message.success('Logged out successfully');
      navigate('/driver-login');
    } else {
      message.error('Failed to logout');
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Not authenticated (will redirect via useEffect, but show nothing meanwhile)
  if (!user || !dispatcher) {
    return null;
  }

  // No route found
  if (!deliveryRoute) {
    return (
      <Result
        status="info"
        title="No Route Found"
        subTitle={`No active route found for ${selectedDate.format('YYYY-MM-DD')}`}
        extra={
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
          />
        }
      />
    );
  }

  const currentOrder = orders[currentStopIndex];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Header style={{
        background: '#fff',
        padding: '0 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Title level={4} style={{ margin: 0 }}>
          {dispatcher.name}'s Route
        </Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            format="MMM DD"
          />
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </Header>

      {/* Content */}
      <Content style={{ position: 'relative', height: 'calc(100vh - 64px)' }}>
        {viewMode === 'next' ? (
          <>
            {/* Map View */}
            <DriverMap
              deliveryRoute={deliveryRoute}
              orders={orders}
              currentStopIndex={currentStopIndex}
              onStopSelect={handleStopSelect}
            />

            {/* Next Stop Card (overlay at bottom) */}
            <NextStopCard
              order={currentOrder}
              stopNumber={currentStopIndex + 1}
              totalStops={orders.length}
              segmentTime={deliveryRoute.segmentTimes[currentStopIndex] || 0}
              onDone={handleDone}
              onUndo={handleUndo}
              onViewAll={() => setViewMode('list')}
            />

            {/* Floating Google Maps Button */}
            <Button
              type="primary"
              size="large"
              icon={<EnvironmentOutlined />}
              onClick={handleOpenGoogleMaps}
              style={{
                position: 'fixed',
                top: 80,
                right: 16,
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              Google Maps
            </Button>
          </>
        ) : (
          <>
            {/* List View */}
            <RouteListView
              orders={orders}
              segmentTimes={deliveryRoute.segmentTimes}
              currentStopIndex={currentStopIndex}
              onStopSelect={handleStopSelect}
              onUndo={handleUndo}
            />

            {/* Back to Map Button */}
            <Button
              type="primary"
              size="large"
              onClick={() => setViewMode('next')}
              style={{
                position: 'fixed',
                bottom: 16,
                left: 16,
                right: 16,
                height: 56,
                zIndex: 1000
              }}
            >
              Back to Map
            </Button>
          </>
        )}
      </Content>
    </Layout>
  );
}
