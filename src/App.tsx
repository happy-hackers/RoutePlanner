import { Layout, Row, Col } from "antd";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navigation from "./components/Navigation";
import ViewOrders from "./pages/view-orders";
import AssignDispatchers from "./pages/assign-disparture";
import RouteResults from "./pages/route-results";
import NavigationMap from "./components/NavigationMap";
import SetDispatcher from "./pages/set-dispatcher";

const { Content, Footer } = Layout;

const pageConfig = {
  "/view-orders": ViewOrders,
  "/assign-dispatcher": AssignDispatchers,
  "/set-dispatcher": SetDispatcher,
  "/route-results": RouteResults,
};

function App() {
  const location = useLocation();
  const PageComponent =
    pageConfig[location.pathname as keyof typeof pageConfig];
  const needMap = PageComponent?.needMap ?? false;
  return (
    <Layout style={{ minHeight: "100vh", flexDirection: "row" }}>
      <Navigation />
      <Layout style={{ flexDirection: "column" }}>
        <Content style={{ flex: 1, padding: "24px" }}>
          <Row style={{ height: "100%", width: "100%" }}>
            <Col flex={needMap ? "300px" : "auto"}>
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/view-orders" replace />}
                />
                <Route path="/view-orders" element={<ViewOrders />} />
                <Route
                  path="/assign-dispatcher"
                  element={<AssignDispatchers />}
                />
                <Route path="/set-dispatcher" element={<SetDispatcher />} />
                <Route path="/route-results" element={<RouteResults />} />
              </Routes>
            </Col>
            {needMap && (
              <Col flex="auto">
                <NavigationMap />
              </Col>
            )}
          </Row>
        </Content>
        <Footer style={{ textAlign: "center" }}>route planner demo</Footer>
      </Layout>
    </Layout>
  );
}

export default App;
