import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useStream } from './useStream';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { GRPC_ENDPOINT /* Spot */ } from '@valorem-labs-inc/sdk';
import { ConnectError, createPromiseClient } from '@connectrpc/connect';
import { QueryClient } from '@tanstack/query-core';
import { renderHook } from '../../test';
import { Spot } from '../lib';

const transport = createGrpcWebTransport({
  baseUrl: GRPC_ENDPOINT,
  credentials: 'include',
});

const grpcClient = createPromiseClient(Spot, transport);
const queryClient = new QueryClient();

describe('useSpotPrice', () => {
  it('Should return an error saying the route is unimplemented', async () => {
    const { result } = renderHook(() =>
      useStream({
        grpcClient,
        queryClient,
        queryKey: ['test'],
        method: 'getSpotPrice',
      }),
    );

    await vi.waitUntil(
      () =>
        result.current?.data?.length === 1 ||
        result.current?.error !== undefined,
      {
        timeout: 15000,
      },
    );

    expect(
      result.current?.error?.message?.includes('unimplemented'),
    ).toBeTruthy();
    expect((result.current?.error as ConnectError)?.code).toEqual(12);
  });
});
