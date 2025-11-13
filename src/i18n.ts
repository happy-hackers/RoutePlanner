import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const pageNamespaces = [
  'assignDispatcher',
  'routeResult',
  'setDispatcher',
  'viewOrder',
  'viewCustomer',
  'setting',
  "driverLogin",
  "driverRoute",
];

const componentNamespaces = [
  "upload",
  "viewDriverRoute",
  "addCustomer",
  "viewDispatcher",
  "addDispatcher",
  "addOrder",
  "openStreetMap",
  "selectOrder",
  "sidebar",
];

const areaNamespaces = [
  'hongkong',
];

const getLoadPath = (lng: string, ns: string) => {
  let folder = '';

  if (pageNamespaces.includes(ns)) {
    folder = 'page/';
  } else if (componentNamespaces.includes(ns)) {
    folder = 'component/';
  } else if (areaNamespaces.includes(ns)) {
    folder = 'area/';
  }

  return `/locales/${lng}/${folder}${ns}.json`;
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({

    //pre-load
    ns: [
      'assignDispatcher',
      'routeResult',
      'setDispatcher',
      'viewOrder',
      'viewCustomer',
      'setting',
      "driverLogin",
      "driverRoute",
      "upload",
      "viewDriverRoute",
      "addCustomer",
      "viewDispatcher",
      "addDispatcher",
      "addOrder",
      "openStreetMap",
      "selectOrder",
      "sidebar",
      'hongkong',
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
      loadPath: (lngs: string[], namespaces: string[]) => {
        const lng = lngs[0];
        const ns = namespaces[0];
        return getLoadPath(lng, ns);
      }
    }
  });

export default i18n;