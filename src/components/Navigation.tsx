import { Layout, Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { MenuProps } from "antd";
import {
  ShoppingOutlined,
  UserSwitchOutlined,
  SettingOutlined,
  CompassOutlined,
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
  const dispatchers = useSelector((state: RootState) => state.dispatchers);
  const navigate = useNavigate();
  const location = useLocation();

  const dispatchersList = dispatchers.map((dispatchers) => {
    return getItem(dispatchers.name, `/route-results/${dispatchers.id}`);
  });

  const menuItems: MenuItem[] = [
    getItem("View Orders", "/view-orders", <ShoppingOutlined />),
    getItem("Assign Dispatcher", "/assign-dispatcher", <UserSwitchOutlined />),
    getItem("Set Dispatcher", "/set-dispatcher", <SettingOutlined />),
    getItem(
      "Route Results",
      "/route-results",
      <CompassOutlined />,
      dispatchersList
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
