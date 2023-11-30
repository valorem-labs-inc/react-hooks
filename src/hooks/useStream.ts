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
export interface UseStreamConfig<
  TService extends ServiceType,
  TParsedResponse,
> {
  /** The Query Client instance from react-query. */
  queryClient: QueryClient;
  /** The Query Key to use for this query in react-query. */
  queryKey: QueryKey;
  /** The gRPC client instance. */
  grpcClient: PromiseClient<TService>;
  /** The method of the gRPC client to be invoked. */
  method: keyof PromiseClient<TService>;
  /** The request object to send to the gRPC stream. */
  request?: InstanceType<TService['methods'][keyof TService['methods']]['I']>;
  /** Flag to enable or disable the stream. Defaults to true. */
  enabled?: boolean;
  /** The timeout in milliseconds for the gRPC request. */
  timeoutMs?: number;
  /** Flag to keep the stream alive even after it ends. Defaults to true. */
  keepAlive?: boolean;
  /** Callback function to parse responses from the gRPC stream. */
  parseResponse?: (
    response: InstanceType<TService['methods'][keyof TService['methods']]['O']>,
  ) => TParsedResponse;
  /** Callback function to handle responses from the gRPC stream. */
  onResponse?: (
    response: TParsedResponse extends undefined
      ? InstanceType<TService['methods'][keyof TService['methods']]['O']>
      : TParsedResponse,
  ) => void;
  /** Callback function to handle errors from the gRPC stream. */
  onError?: (err: Error) => void;
}

type OpenStreamFn = () => Promise<() => void>;
type AbortStreamFn = () => void;

interface UseStreamReturn<TService extends ServiceType, TParsedResponse> {
  data?: TParsedResponse extends undefined
    ? InstanceType<TService['methods'][keyof TService['methods']]['O']>[]
    : TParsedResponse[];
  responses: TParsedResponse[];
  error?: ConnectError | Error;
  openStream: OpenStreamFn;
  abortStream: AbortStreamFn;
  resetAndRestartStream: () => void;
}

/**
 * React hook to integrate gRPC streaming into components.
 * This hook sets up and tears down gRPC streams, notifies about received data and potential errors,
 * and manages relevant local state.
 */
export const useStream = <TService extends ServiceType, TParsedResponse>({
  queryClient,
  queryKey,
  grpcClient,
  method,
  request,
  enabled = true,
  keepAlive = true,
  timeoutMs,
  parseResponse,
  onResponse,
  onError,
}: UseStreamConfig<TService, TParsedResponse>): UseStreamReturn<
  TService,
  TParsedResponse
> => {
  const logger = useLogger();

  /**
   * Refs are used here to keep values across renders without causing re-renders when they change.
   */
  const streamIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  // State variables to hold the responses and error from the gRPC stream.
  const [responses, setResponses] = useState<TParsedResponse[]>([]);
  const [error, setError] = useState<ConnectError | Error>();

  /**
   * Function to abort the current stream.
   */
  const abortStream = useCallback(() => {
    if (abortControllerRef.current !== undefined) {
      logger.debug(`Aborting stream #${streamIdRef.current}`);
      abortControllerRef.current.abort();
      abortControllerRef.current = undefined;
    } else if (streamIdRef.current > 0) {
      logger.debug('Attempted to abort undefined stream.');
    }
  }, [logger]);

  /**
   * Function to open a new stream.
   */
  const openStream = useCallback(async () => {
    // Abort any existing stream before opening a new one.
    abortStream();

    // Create a new AbortController for the upcoming stream.
    abortControllerRef.current = new AbortController();
    streamIdRef.current += 1;

    logger.debug(`Starting stream #${streamIdRef.current}`);
    try {
      while (true) {
        // @ts-expect-error never is not callable
        for await (const res of grpcClient[method](request, {
          signal: abortControllerRef.current.signal,
          timeoutMs,
        })) {
          let response = res;
          if (parseResponse !== undefined) {
            try {
              response = parseResponse(res);
            } catch (err) {
              onError?.(err as Error);
            }
          }
          // Handle the response.
          onResponse?.(response);
          // Update the state with the new response.
          setResponses((prevData) => [response, ...prevData]);
        }

        // If keepAlive is false, break out of the loop once the stream ends.
        if (!keepAlive) break;
      }
    } catch (err) {
      // Handle errors.
      if (err instanceof Error) {
        onError?.(err);
        setError(err);
      }

      if (err instanceof ConnectError) {
        const connectError = ConnectError.from(err);
        if (connectError.code !== Code.Canceled) {
          // Handle errors (excluding cancellations)
          setError(connectError);
          logger.warn({ connectError });
        }
      }
    }

    // Cleanup function to close the stream when the component is unmounted.
    return () => {
      logger.log('closing stream in cleanup');
      abortStream();
    };
  }, [
    abortStream,
    grpcClient,
    keepAlive,
    logger,
    method,
    onError,
    onResponse,
    parseResponse,
    request,
    timeoutMs,
  ]);

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
    abortStream();
    // Reset the state.
    setResponses([]);
    setError(undefined);
    // Clear the query data.
    clearQueryData();

    // Restart the stream after a short delay.
    setTimeout(() => {
      void openStream();
    }, 250);
  }, [abortStream, clearQueryData, openStream]);

  /**
   * useEffect to handle the enabling and disabling of the stream based on the `enabled` prop.
   */
  useEffect(() => {
    if (!enabled && abortControllerRef.current !== undefined) {
      abortStream();
      return;
    }
    if (enabled && abortControllerRef.current === undefined) {
      void openStream();
    } else {
      logger.log('not opening/closing stream, but enabled just changed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- purposefully not exhaustive
  }, [/* openStream,abortStream, */ enabled, logger]);

  /**
   * useEffect to update the query data whenever the responses state changes.
   */
  useEffect(() => {
    queryClient.setQueryData(queryKey, responses);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- purposefully not exhaustive
  }, [/* queryClient, queryKey, */ responses]);

  // Use react-query to update the global query state and handle refetching.
  const { data } = useQuery(
    queryKey,
    () => {
      if (error)
        throw new Error(
          error instanceof ConnectError ? error?.rawMessage : error.toString(),
        );
      const queryData = queryClient.getQueryData(queryKey);
      return (queryData === undefined ? [] : queryData) as UseStreamReturn<
        TService,
        TParsedResponse
      >['data'];
    },
    {
      refetchInterval: 1000,
    },
  );

  // Return values and functions for external use.
  return {
    data,
    error,
    responses,
    openStream,
    abortStream,
    resetAndRestartStream,
  };
};
