import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Islomiy Hisobchi",
    description: "Meros, Zakot va Vasiyat kalkulyatori",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="uz">
            <head>
                <script src="https://telegram.org/js/telegram-web-app.js" async></script>
            </head>
            <body className="bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] antialiased min-h-screen">
                {children}
            </body>
        </html>
    );
}
