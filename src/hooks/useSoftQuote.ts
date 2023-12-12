import type {
  OptionType,
  ParsedSoftQuoteResponse,
} from '@valorem-labs-inc/sdk';
import {
  CLEAR_ADDRESS,
  ItemType,
  QuoteRequest,
  SoftQuote,
  SEAPORT_ADDRESS,
  parseSoftQuoteResponse,
  toH160,
  toH256,
} from '@valorem-labs-inc/sdk';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { hexToBigInt } from 'viem';
import { useStream } from './useStream';
import { usePromiseClient } from './usePromiseClient';

/**
 * Configuration for the useSoftQuote hook.
 * quoteRequest - An object or instance containing the details for requesting a quote.
 * enabled - Flag to enable the hook.
 * timeoutMs - Timeout for the quote request in milliseconds.
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
  onError?: (err: Error) => void;
}

/**
 * Return type of the useSoftQuote hook.
 * quotes - Array of parsed quote responses.
 * responses - Array of raw quote responses.
 * openStream - Function to open the stream for receiving quotes.
 * resetAndRestartStream - Function to reset and restart the quote stream.
 * abortStream - Function to abort the quote stream.
 * error - Error object if an error occurred during the RFQ process.
 */
export interface UseRFQReturn {
  quotes?: ParsedSoftQuoteResponse[];
  responses?: ParsedSoftQuoteResponse[];
  openStream: () => Promise<() => void>;
  resetAndRestartStream: () => void;
  abortStream: () => void;
  error?: Error;
}

/**
 * Hook to manage the useSoftQuote process in the Valorem trading environment.
 * It handles sending quote requests to market makers and receiving their responses.
 * @param config - Configuration for the RFQ process.
 * @returns An object containing the quotes, response management functions, and any errors.
 */
export const useSoftQuote = ({
  quoteRequest,
  enabled,
  timeoutMs = 15000,
  onError,
}: UseRFQConfig): UseRFQReturn => {
  const grpcClient = usePromiseClient(SoftQuote);
  const queryClient = useQueryClient();
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

  const {
    data,
    responses,
    openStream,
    resetAndRestartStream,
    abortStream,
    error,
  } = useStream<typeof SoftQuote, ParsedSoftQuoteResponse>({
    queryClient,
    queryKey: ['useRFQ'],
    grpcClient,
    method: 'webTaker',
    request,
    enabled: enabled && request !== undefined,
    keepAlive: true,
    timeoutMs,
    parseResponse: parseSoftQuoteResponse,
    onError,
  });

  return {
    quotes: data,
    responses,
    openStream,
    resetAndRestartStream,
    abortStream,
    error,
  };
};
