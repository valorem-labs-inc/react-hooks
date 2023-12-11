import { useMemo } from 'react';
import type { Address } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { useChainId } from 'wagmi';
import {
  //   Spot,
  //   SpotPriceInfo,
  //   SpotPriceRequest,
  //   SpotPriceResponse,
  fromH160ToAddress,
  fromH256,
  toH160,
} from '@valorem-labs-inc/sdk';
import { Spot } from '../lib';
import type { SpotPriceResponse } from '../lib/codegen/spot_pb';
import { SpotPriceInfo, SpotPriceRequest } from '../lib/codegen/spot_pb';
import { useStream } from './useStream';
import { usePromiseClient } from './usePromiseClient';

/**
 * Represents a token with its address, symbol, and optional decimals and chain ID.
 */
interface Token {
  address: Address;
  symbol: string;
  decimals?: number;
  chainId?: number;
}

type TokensArr = Readonly<Token[]> | Token[] | undefined;

type Price = bigint | undefined;

/**
 * Configuration for the useSpotPrice hook.
 * spotPriceRequest - An object containing the tokens and chain ID for the spot price request.
 * enabled - Flag to enable the hook.
 */
export interface UseSpotPriceConfig<TToken extends TokensArr> {
  spotPriceRequest?: {
    tokens: NonNullable<TToken>;
    chainId: number;
  };
  enabled?: boolean;
}

/**
 * Infers the symbols from the provided token array.
 */
type InferSymbols<TTokens extends TokensArr> = TTokens extends undefined
  ? 'USDC' | 'WETH'
  : NonNullable<TTokens>[number]['symbol'];

/**
 * The return type of the useSpotPrice hook.
 * spotPrices - An object mapping each token symbol to its spot price.
 */
export interface UseSpotPriceReturn<TTokens extends TokensArr> {
  spotPrices?: Record<InferSymbols<TTokens>, Price | undefined>;
}

/**
 * Hook for fetching live spot prices for ERC20 tokens.
 * It subscribes to a stream of spot price updates and provides the latest prices.
 *
 * @param config - Configuration for fetching spot prices.
 * @returns An object containing the latest spot prices for the requested tokens.
 */
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
