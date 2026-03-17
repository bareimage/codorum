import React from "react";
import ReactDOM from "react-dom/client";
import { TimelineMockupApp } from "./TimelineMockupApp";
import "./index.css"; // Ensure standard tailwind is injected

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TimelineMockupApp />
  </React.StrictMode>
);
