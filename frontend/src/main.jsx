import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import AppContextProvider from "./context/AppContext.jsx";
import { PostsProvider } from "./context/PostsContext.jsx";
import { AdminContextProvider } from "./admin/context/AdminContext.jsx";
import { DoctorContextProvider } from "./admin/context/DoctorContext.jsx";
import { AppContextProvider as AdminPortalAppContextProvider } from "./admin/context/AppContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AppContextProvider>
        <AdminContextProvider>
          <DoctorContextProvider>
            <AdminPortalAppContextProvider>
              <PostsProvider>
                <App />
              </PostsProvider>
            </AdminPortalAppContextProvider>
          </DoctorContextProvider>
        </AdminContextProvider>
      </AppContextProvider>
    </BrowserRouter>
  </StrictMode>
);
