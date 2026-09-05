import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/lovable.css";
import "@/styles/tokens.css";
import { App } from "@/app/providers";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element missing");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
