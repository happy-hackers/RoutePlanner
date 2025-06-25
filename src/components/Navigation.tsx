import { Layout, Menu, App } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import type { MenuProps } from "antd";
import { useEffect, useState } from "react";
import {
  ShoppingOutlined,
  UserSwitchOutlined,
  SettingOutlined,
  CompassOutlined,
} from "@ant-design/icons";
import { getAllDispatchers } from "../utils/dbUtils";
import type { Dispatcher } from "../types/dispatchers";

type MenuItem = Required<MenuProps>["items"][number];

const { Sider } = Layout;

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[]
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

export default function Sidebar() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch orders and dispatchers in parallel
        const [dispatchersData] = await Promise.all([getAllDispatchers()]);

        if (dispatchersData) {
          setDispatchers(dispatchersData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        message.error("Failed to load data. Please try again.");
      }
    };

    fetchData();
  }, []);

  const dispatcherItems = dispatchers.map((dispatcher) =>
    getItem(
      dispatcher.id,
      `/route-results/${dispatcher.id}`,
      <UserSwitchOutlined />
    )
  );

  const menuItems: MenuItem[] = [
    getItem("View Orders", "/view-orders", <ShoppingOutlined />),
    getItem("Assign Dispatcher", "/assign-dispatcher", <UserSwitchOutlined />),
    getItem("Set Dispatcher", "/set-dispatcher", <SettingOutlined />),
    getItem(
      "Route Results",
      "/route-results",
      <CompassOutlined />,
      dispatcherItems
    ),
  ];

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  return (
    <Sider collapsible>
      <Menu
        defaultSelectedKeys={["/view-orders"]}
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </Sider>
  );
}
