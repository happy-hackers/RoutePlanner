import { Layout, Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import type { MenuProps } from "antd";
import {
  ShoppingOutlined,
  UserSwitchOutlined,
  SettingOutlined,
  CompassOutlined,
  SettingFilled,
  TeamOutlined
} from "@ant-design/icons";

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
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = [
    getItem("View Orders", "/view-orders", <ShoppingOutlined />),
    getItem("Assign Dispatcher", "/assign-dispatcher", <UserSwitchOutlined />),
    getItem("Set Dispatcher", "/set-dispatcher", <SettingOutlined />),
    getItem("Route Results", "/route-results", <CompassOutlined />,),
    getItem("View Customers", "/view-customers", <TeamOutlined />),
    getItem("Settings", "/settings", <SettingFilled />),
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
