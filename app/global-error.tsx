"use client";

import { useEffect } from "react";

// Last-resort boundary for errors in the root layout itself. It replaces the
// whole document, so it carries no app styles or providers — plain, bilingual,
// and always renders something a user can act on.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0a0a0f", color: "#f4f6fa" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Something went wrong</h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#8a94a6", margin: "0 0 6px" }}>
              Sorry, that didn't work. Please try again.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#8a94a6", margin: "0 0 20px" }}>
              Désolé, cela n'a pas fonctionné. Veuillez réessayer.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ minHeight: 44, padding: "0 24px", borderRadius: 12, border: "none", background: "#1a6bff", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Try again / Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
