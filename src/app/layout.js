"use client";

import { ConfirmDialogProvider } from "./components/ConfirmDialog";
import { NotificationProvider } from "./components/Notification";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Code Pupil</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <NotificationProvider>
          <ConfirmDialogProvider>
            {children}
          </ConfirmDialogProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
