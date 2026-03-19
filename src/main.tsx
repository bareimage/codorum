import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@mdxeditor/editor/style.css"; // must load BEFORE app.css so our overrides win
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
