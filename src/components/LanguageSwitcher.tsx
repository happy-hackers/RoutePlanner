import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <select onChange={changeLanguage} value={i18n.language}>
      <option value="en">English</option>
      <option value="zh_hans">简体中文</option> 
      <option value="zh_hant">繁體中文</option> 
    </select>
  );
};

export default LanguageSwitcher;