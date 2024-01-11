import type {
  OptionType,
  ParsedQuoteResponse,
  QuoteResponse,
} from '@valorem-labs-inc/sdk';
import {
  CLEAR_ADDRESS,
  ItemType,
  QuoteRequest,
  RFQ,
  SEAPORT_ADDRESS,
  parseQuoteResponse,
  toH160,
  toH256,
} from '@valorem-labs-inc/sdk';
import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { hexToBigInt } from 'viem';
import type { ConnectError } from '@connectrpc/connect';
import { createQueryService } from '@connectrpc/connect-query';
import { useStream } from './useStream';

/**
 * Configuration for the useRFQ hook.
 * quoteRequest - An object or instance containing the details for requesting a quote.
 * enabled - Flag to enable the hook.
 * timeoutMs - Timeout for the quote request in milliseconds.
 * onResponse - Callback function for handling responses.
 * onError - Callback function for handling errors.
 */
export interface UseRFQConfig {
  quoteRequest:
    | QuoteRequest
    | {
        tokenId: OptionType['tokenId'];
        action: QuoteRequest['action'];
        amount: bigint;
      }
    | undefined;
  enabled?: boolean;
  timeoutMs?: number;
  onResponse?: (res: QuoteResponse) => void;
  onError?: (err: Error) => void;
}

/**
 * Return type of the useRFQ hook.
 * quotes - Array of parsed quote responses.
 * isStreaming - Flag to indicate if the quote stream is open.
 * ...rest - Any other properties returned by the useQuery hook.
 */
export type UseRFQReturn = Omit<
  UseQueryResult<ParsedQuoteResponse, ConnectError>,
  'data'
> & {
  quotes?: ParsedQuoteResponse[];
};

/**
 * Hook to manage the Request for Quote (RFQ) process in the Valorem trading environment.
 * It handles sending quote requests to market makers and receiving their responses.
 * @param config - Configuration for the RFQ process.
 * @returns An object containing the quotes, response management functions, and any errors.
 */
export function useRFQ({
  quoteRequest,
  enabled,
  timeoutMs = 15000,
  onResponse,
  onError,
}: UseRFQConfig): UseRFQReturn {
  const { address } = useAccount();
  const chainId = useChainId();

  const request = useMemo(() => {
    if (quoteRequest === undefined) return undefined;

    // pre-constructed quote request
    if (quoteRequest instanceof QuoteRequest) return quoteRequest;

    // construct quote request from quote request config
    if (address === undefined) return undefined;
    const { tokenId, action, amount } = quoteRequest;
    if (tokenId === undefined) return undefined;

    return new QuoteRequest({
      ulid: undefined,
      takerAddress: toH160(address),
      itemType: ItemType.ERC1155,
      tokenAddress: toH160(CLEAR_ADDRESS),
      identifierOrCriteria: toH256(tokenId),
      amount: toH256(amount),
      action,
      chainId: toH256(BigInt(chainId)),
      seaportAddress: toH160(hexToBigInt(SEAPORT_ADDRESS)),
    });
  }, [address, chainId, quoteRequest]);

  const service = createQueryService({ service: RFQ });
  const { data, ...rest } = useStream(
    {
      ...RFQ.methods.webTaker,
      service: {
        ...service,
        typeName: RFQ.typeName,
      },
    },
    request,
    {
      enabled,
      onResponse,
      timeoutMs,
      retry: false,
      refetchInterval: false,
      refetchOnWindowFocus: false,
    },
  );

  const quotes = useMemo(() => {
    const parsed = data?.responses.map((raw) => {
      try {
        return parseQuoteResponse(raw);
      } catch (error) {
        return undefined;
      }
    });
    return parsed?.filter((quote) => quote) as ParsedQuoteResponse[];
  }, [data]);

  useEffect(() => {
    if (rest.error) onError?.(rest.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on error
  }, [rest.error]);

  return {
    quotes,
    ...(rest as Omit<
      UseQueryResult<ParsedQuoteResponse, ConnectError>,
      'data'
    >),
  };
}
