import React from "react";
import ReactDOM from "react-dom/client";
import { applyBranding } from "./applyBranding";
import App from "./App";
import "./index.css";
import "stream-chat-react/dist/css/v2/index.css";
import "./styles/stream-overrides.css";

applyBranding();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
