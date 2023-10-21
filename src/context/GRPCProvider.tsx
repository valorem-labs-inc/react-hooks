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

const webTransport = createGrpcWebTransport({
  baseUrl: GRPC_ENDPOINT,
  credentials: 'include', // necessary for authentication to be set
});

export interface GRPCProviderProps extends PropsWithChildren {
  useDefaultReactQueryProvider?: boolean;
}

export function GRPCProvider({
  useDefaultReactQueryProvider = true,
  children,
}: GRPCProviderProps) {
  const logger = useLogger();
  const transport: Transport = useMemo(() => {
    return { ...webTransport, interceptors: getInterceptors(logger) };
  }, [logger]);

  if (useDefaultReactQueryProvider) {
    return (
      <QueryClientProvider client={queryClient}>
        <TransportProvider transport={transport}>{children}</TransportProvider>
      </QueryClientProvider>
    );
  }

  return (
    <TransportProvider transport={transport}>{children}</TransportProvider>
  );
}
