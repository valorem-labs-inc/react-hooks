import { describe, expect, it, vi } from 'vitest';
import { USDC_ADDRESS, WETH_ADDRESS, renderHook } from '../../test';
import { useOptionType } from './useOptionType';

describe('useOptionType', () => {
  it('mounts & loads optionTypeInfo', async () => {
    const underlyingAsset = WETH_ADDRESS;
    const exerciseAsset = USDC_ADDRESS;
    const underlyingAmount = 1000000000000n; // 1 WETH, 18 decimals
    const exerciseAmount = 1575n; // 2k USDC, 6 decimals
    const { result } = renderHook(() =>
      useOptionType({
        underlyingAsset,
        underlyingAmount,
        exerciseAsset,
        exerciseAmount,
        exerciseTimestamp: 1697443200,
        expiryTimestamp: 1697529600,
      }),
    );

    await vi.waitUntil(() => result.current.optionType.ready);

    const tokenId = result.current.optionType.tokenId;
    const optionTypeId = result.current.optionType.optionTypeId;
    const optionInfo = result.current.optionType.optionInfo;

    expect(tokenId).toEqual(optionTypeId);
    expect(optionTypeId).toEqual(
      39619444411110155182191577564943662405077439414287374917766485031893178777600n,
    );
    expect(optionInfo).toBeDefined();
  });
});
