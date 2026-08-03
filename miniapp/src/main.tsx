import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import { applyPerfMode } from "./lib/perfMode";
import { syncAppHeight } from "./lib/syncAppHeight";
import { syncTelegramSurfaceBackground } from "./lib/telegramSurface";
import "./index.css";

applyPerfMode();
syncTelegramSurfaceBackground();
syncAppHeight();

/** GitHub Pages открывает mini app по /cardigans-app/ — без basename навигация уходит на drgnadmin.github.io/tasks */
function routerBasename(): string | undefined {
  const base = import.meta.env.BASE_URL;
  if (!base || base === "./" || base === "/") return undefined;
  return base.replace(/\/$/, "");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("#root not found");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={routerBasename()}>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
