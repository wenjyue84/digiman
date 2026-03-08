import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/serviceWorker";
import { shouldEnablePWA } from "@shared/utils";

// Register service worker for PWA functionality (including push notifications)
// Use centralized environment detection utility
const shouldRegisterSW = shouldEnablePWA();

if (shouldRegisterSW) {
  // Register SW normally — let it self-update via skipWaiting/clients.claim.
  // IMPORTANT: Do NOT unregister existing SWs on every page load.
  // Unregistering destroys push subscription endpoints, causing 410 errors
  // and preventing cross-device notifications from working.
  registerServiceWorker()
    .then((manager) => {
      console.log('Service Worker registered successfully');
      manager.addEventListener('waiting', () => {
        console.log('New version available - auto-activating');
        manager.skipWaiting();
      });
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
} else {
  console.log('Service Worker registration skipped - environment not supported');
}

createRoot(document.getElementById("root")!).render(<App />);
