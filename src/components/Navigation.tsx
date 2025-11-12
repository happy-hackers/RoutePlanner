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
import { useTranslation } from "react-i18next";

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

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const { t } = useTranslation('sidebar');

  const menuItems: MenuItem[] = [
    getItem(t("menu_view_orders"), "/view-orders", <ShoppingOutlined />),
    getItem(t("menu_assign_dispatcher"), "/assign-dispatcher", <UserSwitchOutlined />),
    getItem(t("menu_route_results"), "/route-results", <CompassOutlined />),
    getItem(t("menu_set_dispatcher"), "/set-dispatcher", <SettingOutlined />),
    getItem(t("menu_view_customers"), "/view-customers", <TeamOutlined />),
    getItem(t("menu_settings"), "/settings", <SettingFilled />),
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
