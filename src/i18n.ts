import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({

    ns: [
      'assignDispatchersPage',
      'hongkongArea',
      'routeResultsPage',
      'setDispatcherPage',
      'viewOrdersPage',
      'viewCustomerPage',
      'settingsPage',
      "driverLoginPage",
      "driverRoutePage",
      "uploadComponent",
      "driverRouteComponent",
      "addCustomerComponent",
      "viewDispatcherComponent",
      "addDispatcherComponent",
      "addOrderComponent",
      "openStreetMapComponent",
      "selectOrderComponent",
    ],

    defaultNS: 'viewOrdersPage',

    //default language
    lng: 'zh-HK',
    supportedLngs: ['zh-HK', 'zh-CN', 'en'],

    debug: false,
    fallbackLng: ['en'],

    detection: {
      order: ['navigator'],
    },

    interpolation: {
      escapeValue: false,
    },

    backend: {
      loadPath: './src/assets/locales/{{lng}}/{{ns}}.json',
    }
  });

export default i18n;