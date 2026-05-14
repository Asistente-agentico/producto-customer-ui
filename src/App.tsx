import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './app/routes';
import { queryClient } from './lib/query-client';
import VersionBanner from './app/VersionBanner';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <VersionBanner />
    </QueryClientProvider>
  );
}
