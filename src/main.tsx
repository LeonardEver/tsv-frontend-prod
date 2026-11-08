import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/lovable.css";
import "@/styles/tokens.css";
import { App } from "@/app/providers";
import { changeLocale, initializeLocale } from "@/i18n";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element missing");

const appRoot = createRoot(rootElement);
void initializeLocale().catch(() => changeLocale("en")).then(() => { appRoot.render(
  <StrictMode>
    <App />
  </StrictMode>,
); });
