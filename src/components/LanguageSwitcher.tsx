import { Select } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (value: string) => {
    i18n.changeLanguage(value);
  };

  const options = [
    { value: "en", label: "English" },
    { value: "zh-CN", label: "简体中文" },
    { value: "zh-HK", label: "繁體中文" },
  ];

  return (
    <Select
      value={i18n.language}
      onChange={changeLanguage}
      options={options}
      style={{ width: 160 }}
    />
  );
};

export default LanguageSwitcher;
