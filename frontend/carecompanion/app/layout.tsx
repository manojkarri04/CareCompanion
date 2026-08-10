import type { Metadata } from 'next';
import '../src/globals.css';
import { AuthProvider } from '../src/AuthProvider';
import { ChatProvider } from '../src/contexts/ChatContext';
export const metadata: Metadata = {
  title: 'CareCompanion - Healthcare AI Assistant',
  description: 'AI-powered health companion, appointment scheduler, medical report analysis, and clinical alerts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <ChatProvider>
            {children}
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
