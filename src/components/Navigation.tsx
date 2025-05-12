import { Layout, Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import type { MenuProps } from "antd";
import {
  PieChartOutlined,
  FileOutlined,
  EditOutlined,
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
    getItem("View Orders", "/view-orders", <PieChartOutlined />),
    getItem("Assign Dispatcher", "/assign-dispatcher", <EditOutlined />),
    getItem("Set Dispatcher", "/set-dispatcher", <EditOutlined />),
    getItem("Route Results", "/route-results", <FileOutlined />, [
      getItem("Dispatcher 1", "/route-results#dispatcher1"),
      getItem("Dispatcher 2", "/route-results#dispatcher2"),
      getItem("Dispatcher 3", "/route-results#dispatcher3"),
    ]),
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
