import React from "react";
import ReactDOM from "react-dom/client";
import { applyBranding } from "./applyBranding";
import App from "./App";
import "./index.css";

applyBranding();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
