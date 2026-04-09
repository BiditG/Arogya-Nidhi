import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import AppContextProvider from "./context/AppContext.jsx";
import { PostsProvider } from "./context/PostsContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AppContextProvider>
        <PostsProvider>
          <App />
        </PostsProvider>
      </AppContextProvider>
    </BrowserRouter>
  </StrictMode>
);

// Register service worker (basic, served from /sw.js)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => console.log('Service Worker registered.'))
      .catch((err) => console.error('SW registration failed:', err));
  });
}
