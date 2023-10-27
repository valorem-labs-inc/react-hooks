// https://connectrpc.com/docs/web/using-clients#managing-clients-and-transports
import { useMemo } from 'react';
import type { ServiceType } from '@bufbuild/protobuf';
import type { PromiseClient } from '@connectrpc/connect';
import { createPromiseClient } from '@connectrpc/connect';
import { useTransport } from '@connectrpc/connect-query';

/**
 * Get a promise client for the given service.
 */
export function usePromiseClient<T extends ServiceType>(
  service: T,
): PromiseClient<T> {
  const transport = useTransport();
  // We memoize the client, so that we only create one instance per service.
  return useMemo(
    () => createPromiseClient(service, transport),
    [transport, service],
  );
}
