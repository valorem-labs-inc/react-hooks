// https://connectrpc.com/docs/web/using-clients#managing-clients-and-transports
import { useMemo } from 'react';
import type { ServiceType } from '@bufbuild/protobuf';
import type { PromiseClient } from '@connectrpc/connect';
import { createPromiseClient } from '@connectrpc/connect';
import { useTransport } from '@connectrpc/connect-query';

/**
 * Custom React hook to obtain a gRPC-web promise client for a specified service.
 * Utilizes ConnectRPC to create a client that can interact with gRPC services.
 * This hook ensures that only one client instance is created per service type,
 * leveraging React's useMemo hook for performance optimization.
 *
 * @param service - The gRPC service type for which the client is created.
 * @returns A promise client instance for the specified gRPC service.
 *
 * @example
 * ```ts
 * const myServiceClient = usePromiseClient(MyService);
 * ```
 */
export function usePromiseClient<T extends ServiceType>(
  service: T,
): PromiseClient<T> {
  const transport = useTransport();

  // Memoize the client to ensure only one instance is created per service.
  // This helps in preventing unnecessary re-renders and optimizes performance.
  return useMemo(
    () => createPromiseClient(service, transport),
    [transport, service], // Dependencies for memoization.
  );
}
