import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
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
            maxWidth: "640px",
            margin: "0 auto",
            background: "#fff",
            border: "1px solid #dfd8cc",
            borderRadius: "16px",
            padding: "22px"
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontFamily: "Cabinet Grotesk, sans-serif" }}>
            Une erreur d'affichage est survenue
          </h1>
          <p style={{ marginTop: 0, color: "#5f5651", lineHeight: 1.55 }}>
            La page n'a pas pu s'afficher correctement. Rechargez l'application pour reprendre votre navigation.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: 0,
              borderRadius: "999px",
              padding: "11px 18px",
              background: "#b83309",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }
}
