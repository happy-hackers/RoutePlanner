import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "antd/dist/reset.css";
import "./index.css";
import "leaflet/dist/leaflet.css";
import { Provider } from "react-redux";
import store from "./store";
import './i18n.ts';

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <App />
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);
