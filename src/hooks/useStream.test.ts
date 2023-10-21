import { describe, it } from 'vitest';
import { USDC_ADDRESS, WETH_ADDRESS, renderHook } from '../../test';
import { RFQ } from '../lib';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { Interceptor, createPromiseClient } from '@connectrpc/connect';
import {
  Action,
  CLEAR_ADDRESS,
  GRPC_ENDPOINT,
  ItemType,
  OptionTypeInfo,
  QuoteRequest,
  SEAPORT_ADDRESS,
  get24HrTimestamps,
  toH160,
  toH256,
} from '@valorem-labs-inc/sdk';
import {
  bytesToBigInt,
  encodeAbiParameters,
  hexToBigInt,
  keccak256,
  pad,
  sliceHex,
  toBytes,
} from 'viem';
import { useStream } from './useStream';
import { QueryClient } from '@tanstack/query-core';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const loggerInterceptor: Interceptor = (next) => async (req) => {
  console.log(`SENDING  MESSAGE  to ${req.url}`);
  const res = await next(req);
  console.log('RECEIVED RESPONSE', JSON.stringify(res));
  return res;
};

const transport = createGrpcWebTransport({
  baseUrl: GRPC_ENDPOINT,
  credentials: 'include', // necessary for authentication to be set
  interceptors: [loggerInterceptor],
});

const grpcClient = createPromiseClient(RFQ, transport);

const queryClient = new QueryClient();
const queryKey = ['Request'];

// Configure your own option type here!
const underlyingAsset = WETH_ADDRESS as `0x${string}`;
const exerciseAsset = USDC_ADDRESS as `0x${string}`;
const underlyingAmount = 1000000000000n; // 1 WETH, divided by 1e6
const exerciseAmount = 1575n; // 1575 USDC, divided by 1e6
const { exerciseTimestamp, expiryTimestamp } = get24HrTimestamps();

const optionInfo = {
  underlyingAsset,
  underlyingAmount,
  exerciseAsset,
  exerciseAmount,
  exerciseTimestamp,
  expiryTimestamp,
};

function getOptionTypeId(info: OptionTypeInfo) {
  const encoded = encodeAbiParameters(
    [
      { type: 'address', name: 'underlyingAsset' },
      { type: 'uint96', name: 'underlyingAmount' },
      { type: 'address', name: 'exerciseAsset' },
      { type: 'uint96', name: 'exerciseAmount' },
      { type: 'uint40', name: 'exerciseTimestamp' },
      { type: 'uint40', name: 'expiryTimestamp' },
    ],
    [
      info.underlyingAsset,
      info.underlyingAmount,
      info.exerciseAsset,
      info.exerciseAmount,
      info.exerciseTimestamp,
      info.expiryTimestamp,
    ],
  ) as `0x${string}`;
  const hashedParams = keccak256(encoded);
  const asBytes20 = toBytes(sliceHex(hashedParams, 0, 20), {
    size: 20,
  });
  const padded = pad(asBytes20, { dir: 'left', size: 32 });
  // eslint-disable-next-line no-bitwise
  const optionTypeId = bytesToBigInt(padded) << BigInt(96);
  return optionTypeId;
}

describe.skip('useCallbackStream', () => {
  it(
    'should work',
    async () => {
      const { result } = renderHook(() =>
        useStream({
          grpcClient,
          method: 'webTaker',
          request: new QuoteRequest({
            ulid: undefined,
            chainId: toH256(BigInt(421613)),
            seaportAddress: toH160(hexToBigInt(SEAPORT_ADDRESS)),
            takerAddress: toH160(
              hexToBigInt('0xb5CF0aC8935Ac3f238B972e465c98BA7E23Dd346'),
            ),
            itemType: ItemType.ERC1155,
            tokenAddress: toH160(CLEAR_ADDRESS),
            identifierOrCriteria: toH256(getOptionTypeId(optionInfo)),
            amount: toH256(1n),
            action: Action.BUY,
          }),
          enabled: true,
          queryClient,
          queryKey,
          keepAlive: false,
        }),
      );
      await sleep(40000);
      console.log(result);
    },
    { timeout: 1000000 },
  );
});
