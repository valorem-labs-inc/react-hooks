import { describe, expect, it, vi } from 'vitest';
import { useStream } from './useStream';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { GRPC_ENDPOINT } from '@valorem-labs-inc/sdk';
import { ConnectError, createPromiseClient } from '@connectrpc/connect';
import { QueryClient } from '@tanstack/query-core';
import { renderHook } from '../../test';
import { Spot } from '../lib';

// Create a gRPC-Web transport instance to connect to the GRPC_ENDPOINT.
const transport = createGrpcWebTransport({
  baseUrl: GRPC_ENDPOINT,
  credentials: 'include', // Use 'include' to handle credentials in requests.
});

// Create a gRPC client for the Spot service.
const grpcClient = createPromiseClient(Spot, transport);

// Initialize a QueryClient for react-query.
const queryClient = new QueryClient();

// Describe the test suite for the useSpotPrice hook.
describe('useSpotPrice', () => {
  // This test checks the handling of unimplemented routes.
  it('Should return an error saying the route is unimplemented', async () => {
    // Render the hook in a test environment.
    const { result } = renderHook(() =>
      useStream({
        grpcClient,
        queryClient,
        queryKey: ['test'], // Define a unique query key.
        method: 'getSpotPrice', // Define the method to be tested.
      }),
    );

    // Wait for the hook to settle, either with data or an error.
    await vi.waitUntil(
      () =>
        result.current?.data?.length === 1 ||
        result.current?.error !== undefined,
      {
        timeout: 15000, // Set a timeout for the test.
      },
    );

    // Expect that the error message includes 'unimplemented'.
    expect(
      result.current?.error?.message?.includes('unimplemented'),
    ).toBeTruthy();

    // Expect that the error code matches the GRPC 'unimplemented' error code (12).
    expect((result.current?.error as ConnectError)?.code).toEqual(12);
  });
});
