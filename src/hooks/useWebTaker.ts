import type { OptionType, ParsedQuoteResponse } from '@valorem-labs-inc/sdk';
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
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { hexToBigInt } from 'viem';
import { useStream } from './useStream';
import { usePromiseClient } from './usePromiseClient';

export interface UseWebTakerConfig {
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

export interface UseWebTakerReturn {
  quotes?: ParsedQuoteResponse[];
}

export function useWebTaker({
  quoteRequest,
  enabled,
  timeoutMs = 15000,
  onError,
}: UseWebTakerConfig): UseWebTakerReturn {
  const grpcClient = usePromiseClient(RFQ);
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

  const { data } = useStream<typeof RFQ, ParsedQuoteResponse>({
    queryClient,
    queryKey: ['useWebTaker'],
    grpcClient,
    method: 'webTaker',
    request,
    enabled: enabled && request !== undefined,
    keepAlive: true,
    timeoutMs,
    parseResponse: parseQuoteResponse,
    onError,
  });

  return { quotes: data };
}
