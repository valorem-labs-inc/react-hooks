import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '../../test';
import { useClaim } from './useClaim';

const claimId =
  39619444411110155182191577564943662405077439414287374917766485031893178777601n;

describe('useClaim', () => {
  it('mounts & loads claim information', async () => {
    const { result } = renderHook(() => useClaim({ claimId }));

    await vi.waitUntil(() => result.current.claim.ready);

    const tokenId = result.current.claim.tokenId;
    const optionTypeId = result.current.claim.optionTypeId;
    const optionInfo = result.current.claim.optionInfo;

    expect(tokenId).toEqual(claimId);
    expect(optionTypeId).toEqual(claimId - 1n);
    expect(optionInfo).toBeDefined();
  });
});
