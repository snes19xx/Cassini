import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[SceneErrorBoundary] caught", error, info);
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
            background: "#000",
            color: "#cfe6ff",
            fontFamily: "var(--font-mono, monospace)",
            zIndex: 50,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, letterSpacing: 2, opacity: 0.7 }}>
            SCENE FAULT
          </div>
          <div style={{ fontSize: 12, maxWidth: 480, opacity: 0.85 }}>
            {this.state.error.message || "An unknown error stopped the 3D scene."}
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: "8px 18px",
              background: "transparent",
              color: "#cfe6ff",
              border: "1px solid #cfe6ff",
              cursor: "pointer",
              letterSpacing: 2,
              fontSize: 11,
            }}
          >
            RECOVER
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
