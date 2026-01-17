import "./setEnv.ts";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles.css";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
