import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/serviceWorker";

// Register service worker for PWA functionality (only in production or localhost)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isProduction = process.env.NODE_ENV === 'production';
const shouldRegisterSW = isLocalhost || isProduction;

if (shouldRegisterSW) {
  registerServiceWorker()
    .then((manager) => {
      console.log('Service Worker registered successfully');
      
      // Listen for service worker updates
      manager.addEventListener('waiting', () => {
        console.log('New version available - service worker waiting');
      });
      
      manager.addEventListener('controlling', () => {
        console.log('New version activated - not auto-reloading');
        // window.location.reload(); // Disabled to prevent deployment conflicts
      });
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
} else {
  console.log('Service Worker registration skipped for deployment environment');
}

createRoot(document.getElementById("root")!).render(<App />);
