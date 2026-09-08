import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rakshak AI — Public Safety Intelligence Platform",
  description: "AI-powered crime analytics and police resource optimization for safer communities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav-bar">
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Brand */}
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: "linear-gradient(135deg, #4f7cff, #818cf8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800, color: "#fff",
                boxShadow: "0 0 16px rgba(79,124,255,0.35)"
              }}>R</div>
              <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#f0f4ff", letterSpacing: "-0.01em" }}>
                Rakshak <span style={{ color: "#4f7cff" }}>AI</span>
              </span>
            </Link>

            {/* Nav links */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <NavLink href="/">Route Finder</NavLink>
              <NavLink href="/crime-search">Crime Search</NavLink>
              <NavLink href="/police/login" police>Police Login</NavLink>
            </div>
          </div>
        </nav>

        <main style={{ minHeight: "calc(100vh - 60px)" }}>
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({ href, children, police }: { href: string; children: React.ReactNode; police?: boolean }) {
  return (
    <Link href={href} style={{
      padding: "6px 14px", borderRadius: 8, fontSize: "0.875rem", fontWeight: 500,
      color: police ? "#f0f4ff" : "rgba(240,244,255,0.7)",
      textDecoration: "none",
      background: police ? "rgba(79,124,255,0.2)" : "transparent",
      border: police ? "1px solid rgba(79,124,255,0.35)" : "1px solid transparent",
      transition: "all 0.2s",
    }}>
      {children}
    </Link>
  );
}
