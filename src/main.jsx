import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";
// Initialize analytics early to ensure it's ready on page load
import "./utils/analytics";

createRoot(document.getElementById("root")).render(
  //<StrictMode>
  <App />
  //</StrictMode>
);
