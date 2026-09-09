import { QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Do not retry authorization or forbidden errors
        if (error instanceof AxiosError && error.response?.status) {
          const status = error.response.status;
          if (status === 401 || status === 403 || status === 404) {
            return false;
          }
        }
        return failureCount < 1;
      }
    },
    mutations: {
      retry: false
    }
  }
});

export default queryClient;
