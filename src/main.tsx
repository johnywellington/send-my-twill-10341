import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ProviderProvider } from "@/contexts/ProviderContext";

createRoot(document.getElementById("root")!).render(
  <ProviderProvider>
    <App />
  </ProviderProvider>
);
