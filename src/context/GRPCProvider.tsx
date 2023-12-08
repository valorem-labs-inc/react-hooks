import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TransportProvider } from '@connectrpc/connect-query';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { useMemo, type PropsWithChildren } from 'react';
import { GRPC_ENDPOINT } from '@valorem-labs-inc/sdk';
import type { Interceptor, Transport } from '@connectrpc/connect';
import { useLogger } from './Logger';

const queryClient = new QueryClient();

const getInterceptors = (logger: ReturnType<typeof useLogger>) => {
  // custom interceptor for logging reqs/res
  const loggerInterceptor: Interceptor = (next) => async (req) => {
    logger.debug('Sending req to ', req.url);
    const res = await next(req);
    logger.debug('Received res ', { res });
    return res;
  };

  return [loggerInterceptor];
};

const getWebTransport = (endpoint: string) =>
  createGrpcWebTransport({
    baseUrl: endpoint,
    credentials: 'include', // necessary for authentication to be set
  });

export interface GRPCProviderProps extends PropsWithChildren {
  endpoint?: string;
  useDefaultReactQueryProvider?: boolean;
}

export function GRPCProvider({
  endpoint = GRPC_ENDPOINT,
  useDefaultReactQueryProvider = true,
  children,
}: GRPCProviderProps) {
  const logger = useLogger();
  const transport: Transport = useMemo(() => {
    return {
      ...getWebTransport(endpoint),
      interceptors: getInterceptors(logger),
    };
  }, [endpoint, logger]);

  if (useDefaultReactQueryProvider) {
    return (
      <TransportProvider transport={transport}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </TransportProvider>
    );
  }

  return (
    <TransportProvider transport={transport}>{children}</TransportProvider>
  );
}
