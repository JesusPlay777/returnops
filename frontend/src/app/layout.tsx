import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { themeInitializationScript } from "@/lib/theme";
import { DemoSessionProvider } from "@/providers/demo-session-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReturnOps — Returns without the runaround",
  description:
    "A clean-room demonstration of a customer-to-operations returns workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={inter.variable}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
        />
      </head>
      <body>
        <ThemeProvider>
          <DemoSessionProvider>{children}</DemoSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
