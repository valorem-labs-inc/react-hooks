import type {
  Message,
  MethodInfoServerStreaming,
  MethodInfoUnary,
  PartialMessage,
  ServiceType,
} from '@bufbuild/protobuf';
import type {
  CallOptions,
  ConnectError,
  StreamResponse,
  Transport,
} from '@connectrpc/connect';
import type { ConnectQueryKey } from '@connectrpc/connect-query';
import { useTransport } from '@connectrpc/connect-query';
import { createAsyncIterable } from '@connectrpc/connect/protocol';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useLogger } from '../context/Logger';

/** Defines a standalone method and associated service  */
export type MethodUnaryDescriptor<
  I extends Message<I>,
  O extends Message<O>,
> = MethodInfoUnary<I, O> & {
  readonly service: Omit<ServiceType, 'methods'>;
};

/**
 * TanStack Query requires query keys in order to decide when the query should automatically update.
 *
 * In Connect-Query, much of this is handled automatically by this function.
 *
 * @see ConnectQueryKey for information on the components of Connect-Query's keys.
 */
export function createConnectQueryKey<
  I extends Message<I>,
  O extends Message<O>,
>(
  methodDescriptor: Pick<MethodUnaryDescriptor<I, O>, 'I' | 'name' | 'service'>,
  input: PartialMessage<I> | undefined,
): ConnectQueryKey<I> {
  return [
    methodDescriptor.service.typeName,
    methodDescriptor.name,
    input ?? {},
  ];
}

export type MethodServerStreamingDescriptor<
  I extends Message<I>,
  O extends Message<O>,
> = MethodInfoServerStreaming<I, O> & {
  readonly service: Omit<ServiceType, 'methods'>;
};

export interface StreamResponseMessage<T> {
  /** List of responses in chronological order */
  responses: T[];
  /** Indicates if the stream is completed or not. */
  done: boolean;
}

function handleStreamResponse<I extends Message<I>, O extends Message<O>>(
  stream: Promise<StreamResponse<I, O>>,
  options?: CallOptions,
): AsyncIterable<O> {
  // eslint-disable-next-line func-names -- generator function
  const it = (async function* () {
    const response = await stream;
    options?.onHeader?.(response.header);
    yield* response.message;
    options?.onTrailer?.(response.trailer);
  })()[Symbol.asyncIterator]();
  return {
    [Symbol.asyncIterator]: () => ({
      next: () => it.next(),
    }),
  };
}

type CreateServerStreamingQueryOptions<
  I extends Message<I>,
  O extends Message<O>,
  SelectOutData = StreamResponseMessage<O>,
> = {
  transport: Transport;
  callOptions?: Omit<CallOptions, 'signal'> | undefined;
} & Omit<
  UseQueryOptions<
    StreamResponseMessage<O>,
    ConnectError,
    SelectOutData,
    ConnectQueryKey<I>
  >,
  'queryFn' | 'queryKey'
>;

/**
 * A React hook to manage gRPC streaming within components. It handles opening and closing streams,
 * updating response states, and manages errors. The hook also integrates with react-query for global state management.
 *
 * @param config - Configuration object for the gRPC streaming process.
 * @returns Object containing stream data, response handling functions, and any errors encountered.
 */
export const useStream = <
  I extends Message<I>,
  O extends Message<O>,
  SelectOutData = StreamResponseMessage<O>,
>(
  methodSig: MethodServerStreamingDescriptor<I, O>,
  input?: PartialMessage<I>,
  {
    transport,
    callOptions,
    onResponse,
    timeoutMs = 15000,
    ...queryOptions
  }: Omit<
    CreateServerStreamingQueryOptions<I, O, SelectOutData>,
    'transport'
  > & {
    transport?: Transport;
    onResponse?: (response: O) => void;
    timeoutMs?: number;
  } = {},
) => {
  const ctxTransport = useTransport();
  const finalTransport = transport ?? ctxTransport;

  const queryClient = useQueryClient();
  const queryKey = createConnectQueryKey(methodSig, input);

  const logger = useLogger();

  const streamIdRef = useRef<number>(0);
  // State to track if the stream is actually open
  const [isStreaming, setIsStreaming] = useState(false);

  const query = useQuery({
    ...queryOptions,
    queryKey,
    queryFn: async () => {
      let responses: O[] = [];
      const streamId = streamIdRef.current;
      streamIdRef.current += 1;
      logger.debug(`Starting stream #${streamId}`);

      const abortController = new AbortController();
      const { signal } = abortController;

      // Set the timeout and save its reference
      const timeoutId = setTimeout(() => {
        logger.debug(`Aborting stream #${streamId}`);
        abortController.abort();
      }, timeoutMs);

      setIsStreaming(true); // Set the stream to open when starting

      try {
        for await (const res of handleStreamResponse(
          finalTransport.stream<I, O>(
            {
              typeName: methodSig.service.typeName,
              methods: {},
            },
            methodSig,
            signal,
            callOptions?.timeoutMs,
            callOptions?.headers,
            createAsyncIterable([input ?? {}]),
          ),
        )) {
          clearTimeout(timeoutId); // Clear the timeout upon receiving a response
          onResponse?.(res); // Handle the response.
          responses = [res, ...responses];
          const newData: StreamResponseMessage<O> = {
            done: false,
            responses,
          };
          queryClient.setQueriesData({ queryKey }, newData);
        }

        return {
          done: true,
          responses,
        } satisfies StreamResponseMessage<O>;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Stream aborted due to timeout');
        }
        throw error;
      } finally {
        logger.log('Closing stream in cleanup...');
        clearTimeout(timeoutId); // Ensure the timeout is cleared if the stream ends or errors
        setIsStreaming(false); // Close the stream when it ends, errors, or aborts
      }
    },
  });

  return {
    ...query,
    isStreaming,
  };
};
