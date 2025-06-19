import { Layout, Row, Col } from "antd";
import { Routes, Route, Navigate } from "react-router-dom";
import { useJsApiLoader } from "@react-google-maps/api";
import Navigation from "./components/Navigation";
import ViewOrders from "./pages/view-orders";
import AssignDispatchers from "./pages/assign-disparture";
import RouteResults from "./pages/route-results";
import SetDispatcher from "./pages/set-dispatcher";
import NavigationMap from "./components/NavigationMap";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import type { MarkerData } from "./types/markers";

const { Content } = Layout;
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

function AppContent() {
  const location = useLocation();
  const [markers, setMarkers] = useState<MarkerData[]>([]);

  const needMap = ["/view-orders", "/assign-dispatcher"].some((path) => {
    const pattern = new RegExp("^" + path.replace(/:[^/]+/g, "[^/]+") + "$");
    return pattern.test(location.pathname);
  });

  return (
    <Layout style={{ minHeight: "100vh", margin: 0, padding: 0 }}>
      <Navigation />
      <Content style={{ flex: 1, padding: "10px" }}>
        <Row style={{ height: "100%", width: "100%" }}>
          <Col flex={needMap ? "295px" : "auto"}>
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
                element={<AssignDispatchers setMarkers={setMarkers} />}
              />
              <Route path="/set-dispatcher" element={<SetDispatcher />} />
              <Route path="/set-dispatcher/:id" element={<SetDispatcher />} />
              <Route path="/route-results" element={<RouteResults />} />
              <Route path="/route-results/:id" element={<RouteResults />} />
              <Route path="*" element={<div>Page not found</div>} />
            </Routes>
          </Col>
          {needMap && (
            <Col flex="auto">
              <NavigationMap markers={markers} />
            </Col>
          )}
        </Row>
      </Content>
    </Layout>
  );
}

function App() {
  // useJsApiLoader() loads Google Maps API script with API key globally
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
  });
  return isLoaded ? <AppContent /> : <div>Loading Map...</div>;
}

export default App;
