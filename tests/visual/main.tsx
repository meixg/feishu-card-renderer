import React from "react";
import { createRoot } from "react-dom/client";

import { CardRenderer } from "../../src";
import "../../src/styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CardRenderer card={{ schema: "2.0" }} />
  </React.StrictMode>,
);
