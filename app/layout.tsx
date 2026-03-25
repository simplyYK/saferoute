import type { Metadata, Viewport } from "next";
import "./globals.css";
import FloatingAIButton from "@/components/shared/FloatingAIButton";

export const metadata: Metadata = {
  title: "Sentinel — Crisis Intelligence Platform",
  description:
    "Real-time crisis intelligence for civilians in conflict zones. Safe routes, threat analysis, emergency resources, and AI-powered survival guidance.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a0f1e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-[#0a0f1e] text-white">
        {children}
        <FloatingAIButton />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(function(){});
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
