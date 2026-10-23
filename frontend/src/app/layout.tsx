import type { Metadata } from "next";
import "./globals.css";
import "@/styles/theme.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Rakshak — Public Safety & Safe Route Navigation Platform",
  description: "Real-time incident analytics, illuminated safe route navigation, and emergency response coordination for citizens and law enforcement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main style={{ minHeight: "calc(100vh - 64px)" }}>
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
