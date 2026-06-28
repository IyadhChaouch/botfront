import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/auth/context";
import { PreferencesProvider } from "@/lib/preferences";
import { BRAND } from "@/lib/brand";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const plexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: `Assistant ${BRAND.name} | ${BRAND.name}`,
  description: `Assistant conversationnel d'${BRAND.name} : posez vos questions sur les produits et services d'assurance et obtenez des réponses fiables.`,
};

// Applies the persisted theme + locale before first paint so there is no flash
// of the wrong Color_Mode / direction. Mirrors the keys used by
// `PreferencesProvider`.
const themeBootstrap = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('mgb-theme');if(t==='dark'||t==='light'){d.setAttribute('data-theme',t);}var l=localStorage.getItem('mgb-locale');if(l==='ar'){d.setAttribute('dir','rtl');d.setAttribute('lang','ar');}var s=localStorage.getItem('mgb-text-size');var px={sm:'15px',base:'16px',lg:'18px',xl:'20px'}[s||'base'];d.style.setProperty('--app-font-size',px);if(localStorage.getItem('mgb-reduce-motion')==='true'){d.classList.add('reduce-motion');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className={`${plexSans.variable} ${plexSansArabic.variable} antialiased`}>
        <PreferencesProvider>
          <AuthProvider>{children}</AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
