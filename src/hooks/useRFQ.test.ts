import { describe, expect, it, vi } from 'vitest';
import { USDC_ADDRESS, WETH_ADDRESS, renderHook } from '../../test';
import {
  Action,
  CLEAR_ADDRESS,
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
import { useRFQ } from './useRFQ';

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

describe('useRFQ', () => {
  it.skip('Should return an error saying the user needs to authenticate first', async () => {
    const { result } = renderHook(() =>
      useRFQ({
        quoteRequest: new QuoteRequest({
          ulid: undefined,
          chainId: toH256(BigInt(421614)),
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
        timeoutMs: 15000,
      }),
    );

    await vi.waitUntil(
      () =>
        result.current?.quotes?.length === 1 ||
        result.current?.error !== undefined,
      {
        timeout: 15000,
      },
    );

    expect(
      result.current?.error?.message?.includes(
        'Failed to retrieve session nonce, you may need to SIWE first',
      ),
    ).toBeTruthy();
  });
});
