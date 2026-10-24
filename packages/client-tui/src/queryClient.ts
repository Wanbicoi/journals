import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: "always",
        refetchOnWindowFocus: false,
        staleTime: 5000,
        retry: 1,
      },
      mutations: {
        networkMode: "always",
      },
    },
  });
}

export const queryClient = createQueryClient();
