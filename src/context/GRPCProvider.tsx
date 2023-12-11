import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TransportProvider } from '@connectrpc/connect-query';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { useMemo, type PropsWithChildren } from 'react';
import { GRPC_ENDPOINT } from '@valorem-labs-inc/sdk';
import type { Interceptor, Transport } from '@connectrpc/connect';
import { useLogger } from './Logger';

// Initialize a new QueryClient instance that can be used by react-query.
const queryClient = new QueryClient();

/**
 * Generates an array of interceptors for gRPC-web transport, including a logger.
 *
 * @param logger - Logger utility for logging requests and responses.
 * @returns - An array of interceptors.
 */
const getInterceptors = (logger: ReturnType<typeof useLogger>) => {
  // Custom interceptor for logging requests and responses.
  const loggerInterceptor: Interceptor = (next) => async (req) => {
    logger.debug('Sending req to ', req.url);
    const res = await next(req);
    logger.debug('Received res ', { res });
    return res;
  };

  return [loggerInterceptor];
};

// Create gRPC-web transport with the given configuration.
const webTransport = createGrpcWebTransport({
  baseUrl: GRPC_ENDPOINT,
  credentials: 'include', // Necessary for authentication to be set.
});

/**
 * Props for the GRPCProvider component.
 */
export interface GRPCProviderProps extends PropsWithChildren {
  useDefaultReactQueryProvider?: boolean; // Whether to use the default React Query Provider.
}

/**
 * The GRPCProvider component provides a gRPC-web transport context for its children,
 * optionally including a react-query provider.
 *
 * @param props - Props for the GRPCProvider, including children and a flag for react-query provider usage.
 * @returns The component wrapped with the TransportProvider and optionally the QueryClientProvider.
 */
export function GRPCProvider({
  useDefaultReactQueryProvider = true, // Default to true to use the QueryClientProvider.
  children,
}: GRPCProviderProps) {
  const logger = useLogger(); // Use the logger context.
  const transport: Transport = useMemo(() => {
    // Memoize the transport to avoid unnecessary re-renders.
    return { ...webTransport, interceptors: getInterceptors(logger) };
  }, [logger]);

  // If the default React Query Provider is to be used, wrap children with both
  // the TransportProvider and the QueryClientProvider.
  if (useDefaultReactQueryProvider) {
    return (
      <TransportProvider transport={transport}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </TransportProvider>
    );
  }

  // If not using the default provider, only wrap with the TransportProvider.
  return (
    <TransportProvider transport={transport}>{children}</TransportProvider>
  );
}
