'use client';

import { Provider } from 'react-redux';
import store from '@/redux/store';
import { Suspense } from 'react';
import Loading from '@/components/loading';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';
import ThemeProvider from '@/components/theme-provider';
import { useTheme } from 'next-themes';

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return <Provider store={store}>{children}</Provider>;
};

// ThemedToaster component
const ThemedToaster = () => {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme as 'light' | 'dark' | 'system'}
      richColors
      closeButton
      position="bottom-right"
    />
  );
};

// Client Wrapper
const ClientWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AppProvider>
        <Suspense fallback={<Loading />}>
          {children}
          <ThemedToaster />
          <Analytics />
        </Suspense>
      </AppProvider>
    </ThemeProvider>
  );
};

export default ClientWrapper;
