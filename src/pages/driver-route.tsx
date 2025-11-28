import { useState, useEffect } from "react";
import sound from "../assets/sounds/sms-received1.mp3";
import { useNavigate } from "react-router-dom";
import {
  Layout,
  Button,
  Spin,
  Result,
  DatePicker,
  Typography,
  App,
  Row,
  Col,
} from "antd";
import { EnvironmentOutlined, LogoutOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import NextStopCard from "../components/driver/NextStopCard";
import RouteListView from "../components/driver/RouteListView";
import DriverMap from "../components/driver/DriverMap";
import {
  getDriverActiveRoute,
  updateMeterNote,
  updateOrderStatus,
} from "../utils/dbUtils";
import { generateGoogleMapsUrl, getDistance } from "../utils/mapUtils";
import { logoutDriver } from "../utils/authUtils";
import { useAuth } from "../contexts/AuthContext";
import type { DeliveryRoute } from "../types/delivery-route";
import { useTranslation } from "react-i18next";
import type { AddressMetersElement } from "../types/route.ts";

const { Header, Content } = Layout;
const { Title } = Typography;

type ViewMode = "next" | "list";

export default function DriverRoute() {
  const { t } = useTranslation("driverRoute");
  const navigate = useNavigate();
  const { user, dispatcher, loading: authLoading } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [deliveryRoute, setDeliveryRoute] = useState<DeliveryRoute | null>(
    null
  );
  //const [orders, setOrders] = useState<Order[]>([]);
  const [stops, setStops] = useState<AddressMetersElement[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("next");
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [driverLocation, setDriverLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [hasWarned, setHasWarned] = useState(true);

  const { message, modal } = App.useApp();
  const currentStop = stops[currentStopIndex];

  function hasIncompleteMeters(stop: AddressMetersElement): boolean {
    return stop.meters.some((meter) => meter.status !== "Delivered");
  }

  // Watch driver location
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDriverLocation({ lat: latitude, lng: longitude });
      },
      (error) => console.error("Geolocation error:", error),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Detect departure and trigger alert
  useEffect(() => {
    if (!driverLocation || !currentStop) return;

    const stopLat = currentStop.lat;
    const stopLng = currentStop.lng;

    const distance = getDistance(
      driverLocation.lat,
      driverLocation.lng,
      stopLat,
      stopLng
    );

    if (distance > 80 && hasIncompleteMeters(currentStop) && !hasWarned) {
      const incompleteCount = currentStop.meters.filter(
        (m) => m.status !== "Delivered"
      ).length;

      modal.info({
        title: `You have ${incompleteCount} incompleted meters in the current stop`,
      });
      const notification_sound = new Audio(sound);
      notification_sound.play();
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      setHasWarned(true);
    }
    if (distance <= 80) {
      setHasWarned(false);
    }
  }, [driverLocation, currentStop, hasWarned, modal]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/driver-login");
    }
  }, [user, authLoading, navigate]);

  // Fetch route data
  const fetchRouteData = async (date: string) => {
    if (!dispatcher) {
      return;
    }

    try {
      setLoading(true);

      // Get active route
      const routeData = await getDriverActiveRoute(dispatcher.id, date);

      if (!routeData) {
        setDeliveryRoute(null);
        setStops([]);
        return;
      }

      setDeliveryRoute(routeData);

      setStops(routeData.addressMeterSequence);

      // Set current stop to first incomplete
      const firstIncomplete = routeData.addressMeterSequence.findIndex((stop) =>
        stop.meters.some((order) => order.status !== "Delivered")
      );
      setCurrentStopIndex(firstIncomplete !== -1 ? firstIncomplete : 0);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      message.error(t("message_fail_load_route"));
    } finally {
      setLoading(false);
    }
  };

  // Load route on mount and date change
  useEffect(() => {
    if (dispatcher) {
      fetchRouteData(selectedDate.format("YYYY-MM-DD"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Handle mark as done
  const handleMeterDone = async (orderId: number) => {
    try {
      await updateOrderStatus(orderId, "Delivered");

      setStops((prev) =>
        prev.map((stop) => ({
          ...stop,
          meters: stop.meters.map((order) =>
            order.id === orderId
              ? { ...order, status: "Delivered" as const }
              : order
          ),
        }))
      );

      message.success(t("message_done_success"), 1);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      message.error(t("message_fail_update_status"));
    }
  };

  // Handle undo (revert delivered status)
  const handleMeterUndo = async (orderId: number) => {
    try {
      await updateOrderStatus(orderId, "In Progress");

      setStops((prev) =>
        prev.map((stop) => ({
          ...stop,
          meters: stop.meters.map((order) =>
            order.id === orderId
              ? { ...order, status: "In Progress" as const }
              : order
          ),
        }))
      );

      message.success(t("message_undo_success"), 1);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      message.error(t("message_fail_revert_status"));
    }
  };

  const handleSaveNote = async (orderId: number, note: string) => {
    try {
      await updateMeterNote(orderId, note);
      setStops((prev) =>
        prev.map((stop) => ({
          ...stop,
          meters: stop.meters.map((order) =>
            order.id === orderId
              ? { ...order, note: note, lastNoteTime: new Date().toISOString() }
              : order
          ),
        }))
      );
      message.success("Note saved!");
    } catch (e) {
      message.error("Failed to save note");
    }
  };

  // Handle stop selection from list
  const handleStopSelect = (index: number) => {
    setCurrentStopIndex(index);
    setViewMode("next");
    setHasWarned(true);
  };

  // Open Google Maps
  const handleOpenGoogleMaps = () => {
    if (deliveryRoute && stops.length > 0) {
      const url = generateGoogleMapsUrl(deliveryRoute);
      window.open(url, "_blank");
    }
  };

  // Handle logout
  const handleLogout = async () => {
    const result = await logoutDriver();
    if (result.success) {
      message.success(t("message_logout_success"));
      navigate("/driver-login");
    } else {
      message.error(t("message_fail_logout"));
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
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
      <Layout style={{ minHeight: "100vh" }}>
        <Header style={{ background: "#fff", padding: "0 16px" }}>
          <Row justify="end">
            <Col>
              <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                {t("button_logout")}
              </Button>
            </Col>
          </Row>
        </Header>

        <Content style={{ margin: "24px" }}>
          <Result
            status="info"
            title={t("result_no_route_title")}
            subTitle={t("result_no_route_subtitle", {
              date: selectedDate.format("YYYY-MM-DD"),
            })}
            extra={
              <DatePicker
                value={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
              />
            }
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Header */}
      <Header
        style={{
          background: "#fff",
          padding: "0 16px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          {t("header_title", { dispatcherName: dispatcher.name })}
        </Title>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            format="YYYY-MM-DD"
          />
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            {t("button_logout")}
          </Button>
        </div>
      </Header>

      {/* Content */}
      <Content style={{ position: "relative", height: "calc(100vh - 64px)" }}>
        {viewMode === "next" ? (
          <>
            {/* Map View */}
            <DriverMap
              deliveryRoute={deliveryRoute}
              stops={stops}
              currentStopIndex={currentStopIndex}
              onStopSelect={handleStopSelect}
            />

            {/* Next Stop Card (overlay at bottom) */}
            <NextStopCard
              stop={currentStop}
              stopNumber={currentStopIndex + 1}
              totalStops={stops.length}
              segmentTime={deliveryRoute.segmentTimes[currentStopIndex] || 0}
              onViewAll={() => setViewMode("list")}
              onMeterDone={handleMeterDone}
              onMeterUndo={handleMeterUndo}
              onNoteSave={handleSaveNote}
            />

            {/* Floating Google Maps Button */}
            <Button
              type="primary"
              size="large"
              icon={<EnvironmentOutlined />}
              onClick={handleOpenGoogleMaps}
              style={{
                position: "fixed",
                top: 80,
                right: 16,
                zIndex: 1001,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              {t("button_google_maps")}
            </Button>
          </>
        ) : (
          <>
            {/* List View */}
            <RouteListView
              stops={stops}
              segmentTimes={deliveryRoute.segmentTimes}
              currentStopIndex={currentStopIndex}
              onStopSelect={handleStopSelect}
            />

            {/* Back to Map Button */}
            <Button
              type="primary"
              size="large"
              onClick={() => setViewMode("next")}
              style={{
                position: "fixed",
                bottom: 16,
                left: 16,
                right: 16,
                height: 56,
                zIndex: 1000,
              }}
            >
              {t("button_back_to_map")}
            </Button>
          </>
        )}
      </Content>
    </Layout>
  );
}
