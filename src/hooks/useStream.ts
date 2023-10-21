/* eslint-disable no-constant-condition -- needed for streams */
/* eslint-disable @typescript-eslint/no-unnecessary-condition -- needed for streams */
/* eslint-disable no-await-in-loop -- needed for streams */

import type { PromiseClient } from '@connectrpc/connect';
import { Code, ConnectError } from '@connectrpc/connect';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { ServiceType } from '@bufbuild/protobuf';
import { useLogger } from '../context/Logger';

/**
 * Interface for the properties accepted by the useStream hook.
 */
export interface UseStreamProps<TClient extends PromiseClient<ServiceType>> {
  /** The Query Client instance from react-query. */
  queryClient: QueryClient;
  /** The Query Key to use for this query in react-query. */
  queryKey: QueryKey;
  /** The gRPC client instance. */
  grpcClient: TClient;
  /** The method of the gRPC client to be invoked. */
  method: keyof TClient;
  /** The request object to send to the gRPC stream. */
  request?: TClient[keyof TClient]['I'];
  /** Flag to enable or disable the stream. Defaults to true. */
  enabled?: boolean;
  /** The timeout in milliseconds for the gRPC request. */
  timeoutMs?: number;
  /** Flag to keep the stream alive even after it ends. Defaults to true. */
  keepAlive?: boolean;
  /** Callback function to handle responses from the gRPC stream. */
  onResponse?: (
    response: TClient['methods'][keyof TClient['methods']]['O'],
  ) => void;
  /** Callback function to handle errors from the gRPC stream. */
  onError?: (err: Error) => void;
}

type OpenStreamFn = () => Promise<() => void>;
type AbortStreamFn = () => void;

interface UseStreamReturn<TClient extends PromiseClient<ServiceType>> {
  responses: TClient['methods'][keyof TClient['methods']]['O'][];
  error?: ConnectError;
  openStream?: OpenStreamFn;
  abortStream?: AbortStreamFn;
  resetAndRestartStream: () => void;
}

/**
 * React hook to integrate gRPC streaming into components.
 * This hook sets up and tears down gRPC streams, notifies about received data and potential errors,
 * and manages relevant local state.
 */
export const useStream = <TClient extends PromiseClient<ServiceType>>({
  queryClient,
  queryKey,
  grpcClient,
  method,
  request,
  enabled = true,
  keepAlive = true,
  timeoutMs,
  onResponse,
  onError,
}: UseStreamProps<TClient>): UseStreamReturn<TClient> => {
  const logger = useLogger();

  /**
   * Refs are used here to keep values across renders without causing re-renders when they change.
   */
  const streamIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController>();
  const abortStreamRef = useRef<AbortStreamFn>();
  const openStreamRef = useRef<() => Promise<() => void>>();

  // State variables to hold the responses and error from the gRPC stream.
  const [responses, setResponses] = useState<
    TClient['methods'][keyof TClient['methods']]['O'][]
  >([]);
  const [error, setError] = useState<ConnectError>();

  /**
   * Function to abort the current stream.
   */
  const _abortStream = useCallback(() => {
    if (abortControllerRef.current !== undefined) {
      logger.debug(`Aborting stream #${streamIdRef.current}`);
      abortControllerRef.current.abort();
      abortControllerRef.current = undefined;
    } else if (streamIdRef.current > 0) {
      logger.debug('Attempted to abort undefined stream.');
    }
  }, [logger]);
  abortStreamRef.current = _abortStream;

  /**
   * Function to open a new stream.
   */
  const _openStream = useCallback(async () => {
    // Abort any existing stream before opening a new one.
    abortStreamRef.current?.();

    // Create a new AbortController for the upcoming stream.
    abortControllerRef.current = new AbortController();
    streamIdRef.current += 1;

    // Log the starting of a new stream.
    logger.debug(`Starting stream #${streamIdRef.current}`);
    try {
      while (true) {
        // @ts-expect-error never is not callable
        for await (const res of grpcClient[method](request, {
          signal: abortControllerRef.current.signal,
          timeoutMs,
        })) {
          // Handle the response.
          onResponse?.(res);
          // Update the state with the new response.
          setResponses((prevData) => [...prevData, res]);
        }

        // If keepAlive is false, break out of the loop once the stream ends.
        if (!keepAlive) break;
      }
    } catch (err) {
      // Handle errors.
      if (err instanceof Error) {
        onError?.(err);
      }

      if (err instanceof ConnectError) {
        const connectError = ConnectError.from(err);
        if (connectError.code !== Code.Canceled) {
          // Handle errors (excluding cancellations)
          setError(connectError);
        }
      }
    }

    // Cleanup function to close the stream when the component is unmounted.
    return () => {
      logger.log('closing stream in cleanup');
      abortStreamRef.current?.();
    };
  }, [
    grpcClient,
    keepAlive,
    logger,
    method,
    onError,
    onResponse,
    request,
    timeoutMs,
  ]);
  openStreamRef.current = _openStream;

  // Callback to clear the query data.
  const clearQueryData = useCallback(
    () => queryClient.setQueryData(queryKey, []),
    [queryClient, queryKey],
  );

  /**
   * Function to reset and restart the stream.
   */
  const resetAndRestartStream = useCallback(() => {
    // Abort the current stream.
    abortStreamRef.current?.();
    // Reset the state.
    setResponses([]);
    setError(undefined);
    // Clear the query data.
    clearQueryData();

    // Restart the stream after a short delay.
    setTimeout(() => {
      void openStreamRef.current?.();
    }, 250);
  }, [clearQueryData]);

  /**
   * useEffect to handle the enabling and disabling of the stream based on the `enabled` prop.
   */
  useEffect(() => {
    if (!enabled && abortControllerRef.current !== undefined) {
      abortStreamRef.current?.();
      return;
    }
    if (enabled && abortControllerRef.current === undefined) {
      void openStreamRef.current?.();
    } else {
      logger.log('not opening/closing stream, but enabled just changed');
    }
  }, [enabled, logger]);

  /**
   * useEffect to update the query data whenever the responses state changes.
   */
  useEffect(() => {
    queryClient.setQueryData(queryKey, responses);
  }, [queryClient, queryKey, responses]);

  // Use react-query to update the global query state and handle refetching.
  useQuery(
    queryKey,
    () => {
      if (error) throw new Error(error.rawMessage);
      return queryClient.getQueryData(queryKey);
    },
    {
      refetchInterval: 1000,
    },
  );

  // Return values and functions for external use.
  return {
    responses,
    error,
    openStream: openStreamRef.current,
    abortStream: abortStreamRef.current,
    resetAndRestartStream,
  };
};
