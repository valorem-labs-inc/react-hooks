import { useMemo } from 'react';
import type { Address } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { useChainId } from 'wagmi';
import { fromH160ToAddress, fromH256, toH160 } from '@valorem-labs-inc/sdk';
import type { SpotPriceResponse } from '../lib';
import { Spot, SpotPriceInfo, SpotPriceRequest } from '../lib';
import { useStream } from './useStream';
import { usePromiseClient } from './usePromiseClient';

interface Token {
  address: Address;
  symbol: string;
  decimals?: number;
  chainId?: number;
}

type TokensArr = Readonly<Token[]> | Token[] | undefined;

type Price = bigint | undefined;

export interface UseSpotPriceConfig<TToken extends TokensArr> {
  spotPriceRequest?: {
    tokens: NonNullable<TToken>;
    chainId: number;
  };
  enabled?: boolean;
}

type InferSymbols<TTokens extends TokensArr> = TTokens extends undefined
  ? 'USDC' | 'WETH'
  : NonNullable<TTokens>[number]['symbol'];

export interface UseSpotPriceReturn<TTokens extends TokensArr> {
  spotPrices?: Record<InferSymbols<TTokens>, Price | undefined>;
}

export function useSpotPrice<TTokens extends TokensArr>({
  spotPriceRequest,
  enabled,
}: UseSpotPriceConfig<TTokens>): UseSpotPriceReturn<TTokens> {
  const grpcClient = usePromiseClient(Spot);
  const queryClient = useQueryClient();
  const chainId = useChainId();

  const addressToSymbolMap = useMemo(
    () =>
      new Map(
        spotPriceRequest?.tokens.map((token) => [token.address, token.symbol]),
      ),
    [spotPriceRequest?.tokens],
  );

  const request = useMemo(() => {
    if (spotPriceRequest !== undefined) {
      // use provided arguments
      const { tokens, chainId: _chainId } = spotPriceRequest;
      const spotPriceInfo = tokens.map((token) => {
        return new SpotPriceInfo({
          chainId: BigInt(_chainId),
          tokenAddress: toH160(token.address),
        });
      });
      return new SpotPriceRequest({ spotPriceInfo });
    }

    // default to current chainId and all assets if no arguments provided
    // TODO: PUT WETH AND USDC IN HERE
    const spotPriceInfo = [new SpotPriceInfo({ chainId: BigInt(chainId) })];
    return new SpotPriceRequest({ spotPriceInfo });
  }, [chainId, spotPriceRequest]);

  const { data: spotPriceResponses } = useStream<
    typeof Spot,
    SpotPriceResponse
  >({
    queryClient,
    queryKey: ['useSpotPrice'],
    grpcClient,
    method: 'getSpotPrice',
    request,
    enabled,
    keepAlive: true,
    timeoutMs: 15000,
  });

  const spotPrices = useMemo(() => {
    if (spotPriceResponses === undefined) return undefined;
    const prices: Record<string, Price | undefined> = {};
    const latestResponse = spotPriceResponses[0];

    latestResponse.spotPriceInfo.forEach((info) => {
      const { tokenAddress, spotPrice } = info;
      const price = spotPrice !== undefined ? fromH256(spotPrice) : undefined;
      const address =
        tokenAddress !== undefined
          ? fromH160ToAddress(tokenAddress)
          : undefined;

      if (price && address) {
        const symbol = addressToSymbolMap.get(address);
        if (symbol) {
          prices[symbol] = price;
        }
      }
    });

    return prices;
  }, [addressToSymbolMap, spotPriceResponses]);

  return { spotPrices };
}
