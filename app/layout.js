"use client";

import { ConfirmDialogProvider } from "./components/ConfirmDialog";
import { NotificationProvider } from "./components/Notification";
import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Faculty Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, overflow: "hidden" }}>
        <NotificationProvider>
          <ConfirmDialogProvider>
            {children}
          </ConfirmDialogProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
