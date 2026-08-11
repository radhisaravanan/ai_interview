import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx"; // Added explicit .jsx extension to resolve standard bundler path mappings

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
