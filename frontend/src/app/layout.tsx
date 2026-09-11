import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Rakshak AI — Public Safety Intelligence Platform",
  description: "AI-powered crime analytics, safe route navigation, and safety intelligence for citizens and responders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main style={{ minHeight: "calc(100vh - 64px)" }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
