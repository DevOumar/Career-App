import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "24px",
          background: "#f3efe8",
          color: "#111",
          fontFamily: "Instrument Sans, sans-serif"
        }}
      >
        <div
          style={{
            maxWidth: "920px",
            margin: "0 auto",
            background: "#fff",
            border: "1px solid #dfd8cc",
            borderRadius: "12px",
            padding: "16px"
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontFamily: "Cabinet Grotesk, sans-serif" }}>
            Erreur d'affichage détectée
          </h1>
          <p style={{ marginTop: 0 }}>
            L'application a rencontré une erreur runtime. Ouvre la console navigateur pour la stack complète.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              overflowX: "auto",
              background: "#f8f4ec",
              border: "1px solid #e9e2d4",
              borderRadius: "8px",
              padding: "12px"
            }}
          >
            {String(this.state.error?.message || this.state.error || "Erreur inconnue")}
          </pre>
        </div>
      </div>
    );
  }
}
