import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '../../test';
import { useOption } from './useOption';

const optionId =
  39619444411110155182191577564943662405077439414287374917766485031893178777600n;

describe('useOption', () => {
  it('mounts & loads option info', async () => {
    const { result } = renderHook(() => useOption({ optionId }));

    await vi.waitUntil(() => result.current.option.ready);

    const tokenId = result.current.option.tokenId;
    const optionTypeId = result.current.option.optionTypeId;
    const optionInfo = result.current.option.optionInfo;

    expect(tokenId?.toString()).toEqual(optionId.toString());
    expect(optionTypeId).toEqual(optionId);
    expect(optionInfo).toBeDefined();
  });
});
