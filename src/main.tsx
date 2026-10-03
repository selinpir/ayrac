import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="fatal">
          <h1>Ayraç açılamadı</h1>
          <p>
            Kayıtların silinmedi. Paneli yeniden açmayı veya uzantıyı yenilemeyi
            dene.
          </p>
          <button onClick={() => location.reload()}>Paneli yenile</button>
        </div>
      );
    return this.props.children;
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
