import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'THI | E-Stamp Filing',
  description: 'ระบบนำส่งข้อมูลขอเสียอากรแสตมป์เป็นตัวเงิน',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-background text-foreground font-sarabun antialiased">
        <ToastProvider>
          <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            <Navbar />
            <main className="flex-1 relative">
              {/* Ambient glow */}
              <div className="pointer-events-none fixed top-0 right-0 w-1/2 h-64 bg-blue-500/5 blur-[100px] -z-10" />
              <div className="pointer-events-none fixed bottom-0 left-0 w-1/2 h-64 bg-accent/5 blur-[100px] -z-10" />
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
