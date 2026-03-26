import { ReactNode } from "react";
import Script from "next/script";
import { LanguageProvider } from "../components/providers/LanguageProvider";
import TelegramAuthBootstrap from "../components/providers/TelegramAuthBootstrap";
import UIEffectsBootstrap from "../components/providers/UIEffectsBootstrap";
import AuthProvider from "../components/providers/AuthProvider";
import "./globals.css";

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
          <TelegramAuthBootstrap />
          <UIEffectsBootstrap />
        </AuthProvider>
      </body>
    </html>
  );
}
