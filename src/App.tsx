import { ConfigProvider, Layout, Row, Col, App as AntApp } from "antd";
import { Routes, Route, Navigate } from "react-router-dom";
import { useJsApiLoader } from "@react-google-maps/api";
import Navigation from "./components/Navigation";
import ViewOrders from "./pages/view-orders";
import AssignDispatchers from "./pages/assign-dispatcher";
import RouteResults from "./pages/route-results";
import ViewCustomers from "./pages/view-customers";
import SetDispatcher from "./pages/set-dispatcher";
import Settings from "./pages/settings";
import DriverRoute from "./pages/driver-route";
import DriverLogin from "./pages/driver-login";
import DynamicMap from "./components/DynamicMap";
import { AuthProvider } from "./contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import type { MarkerData } from "./types/markers";
import { useDispatch, useSelector } from "react-redux";
import { getAllDispatchers } from "./utils/dbUtils";
import { setDispatchers } from "./store/dispatcherSlice";
import type { RootState } from "./store";
import { useTranslation } from 'react-i18next';
import zhCN from 'antd/locale/zh_CN';
import zhTW from 'antd/locale/zh_TW';
import enUS from 'antd/locale/en_US';
import type { Locale } from 'antd/es/locale';

const { Content } = Layout;
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
const GOOGLE_MAPS_LIBRARIES: ("maps" | "marker" | "routes")[] = ["maps", "marker", "routes"];

type LocaleKey = 'zh-CN' | 'zh-HK' | 'en';
const antdLocales: Record<LocaleKey, Locale> = {
  'zh-CN': zhCN,
  'zh-HK': zhTW,
  'en': enUS,
};

interface AppContentProps {
  isGoogleMapSelected: boolean;
  isMapReady: boolean;
}

function AppContent({ isGoogleMapSelected, isMapReady }: AppContentProps) {
  const dispatch = useDispatch();
  const location = useLocation();
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [hoveredOrderId, setHoveredOrderId] = useState<number | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emptyArray: any[] = [];
  const emptySetter = () => {};

  const [isInitialRenderComplete, setIsInitialRenderComplete] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dispatchersData = await getAllDispatchers();
        if (dispatchersData)
          dispatch(setDispatchers(dispatchersData));
      } catch (err) {
        console.error("Failed to fetch dispatchers:", err);
      }
    };
    fetchData();
    setIsInitialRenderComplete(true);
  }, [dispatch]);


  const needMap = ["/view-orders", "/assign-dispatcher"].some((path) => {
    const pattern = new RegExp("^" + path.replace(/:[^/]+/g, "[^/]+") + "$");
    return pattern.test(location.pathname);
  });

  const isDriverPage = location.pathname.startsWith("/driver-route") || location.pathname.startsWith("/driver-login");

  if (isDriverPage) {
    return (
      <Routes>
        <Route path="/driver-login" element={<DriverLogin />} />
        <Route path="/driver-route" element={<DriverRoute />} />
      </Routes>
    );
  }

  if (needMap && !isInitialRenderComplete) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        Loading Application Data...
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", margin: 0, padding: 0 }}>
      <Navigation />
      <Content style={{ flex: 1, padding: "10px" }}>
        <Row style={{ height: "100%", width: "100%" }}>
          <Col flex={needMap ? "650px" : "auto"} style={{ marginRight: needMap ? 10 : 0 }}>
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/view-orders" replace />}
              />
              <Route
                path="/view-orders"
                element={<ViewOrders setMarkers={setMarkers} />} 
              />
              <Route
                path="/assign-dispatcher"
                element={<AssignDispatchers setMarkers={setMarkers} hoveredOrderId={hoveredOrderId} setHoveredOrderId={setHoveredOrderId} />}
              />
              <Route path="/set-dispatcher" element={<SetDispatcher />} />
              <Route path="/route-results" element={<RouteResults />} />
              <Route path="/view-customers" element={<ViewCustomers />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<div>Page not found</div>} />
            </Routes>
          </Col>
          {needMap && (
            <Col flex="auto">
              {!isMapReady ? (
                isGoogleMapSelected ? (
                  <div>Loading Google Map Service...</div>
                ) : (
                  <div>Loading Map...</div>
                )
              ) : (
                <DynamicMap 
                  orderMarkers={markers} 
                  setOrderMarkers={setMarkers} 
                  setSelectedRowId={() => {}} 
                  isRouteResultsPage={false}
                  newRoutes={emptyArray}
                  setNewRoutes={emptySetter}
                  isAllRoutes={false}
                  selectedDispatcher={null}
                />
              )}
            </Col>
          )}
        </Row>
      </Content>
    </Layout>
  );
}

function App() {
  const { i18n } = useTranslation();
  const language = i18n.language as LocaleKey;

  const mapProvider = useSelector((state: RootState) => state.config.mapProvider);

  const isGoogleMapSelected = mapProvider === "GoogleMap";

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: GOOGLE_MAPS_LIBRARIES, 
  });

  const isMapReady = !isGoogleMapSelected || isLoaded;

  const currentLocale = antdLocales[language] || antdLocales['en'];

  if (isGoogleMapSelected && !isLoaded) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '18px'
      }}>
        Loading Map Service...
      </div>
    );
  }

  return (
    <AuthProvider>
      <ConfigProvider locale={currentLocale}>
        <AntApp>
          <AppContent
            key={mapProvider} 
            isGoogleMapSelected={isGoogleMapSelected}
            isMapReady={isMapReady}
          />
        </AntApp>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;