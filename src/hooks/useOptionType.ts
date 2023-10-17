import type { OptionTypeInfo } from '@nickadamson/sdk';
import { OptionType } from '@nickadamson/sdk';
import { usePublicClient } from 'wagmi';
import { useMemo } from 'react';
import { useClearOption } from '../lib/codegen/wagmi';

export function useOptionType(args: OptionTypeInfo) {
  const publicClient = usePublicClient();

  const optionType = useMemo(() => {
    return new OptionType({ optionInfo: args, publicClient });
  }, [args, publicClient]);

  const { data, isLoading: optionTypeLoading } = useClearOption({
    args: optionType.tokenId ? [optionType.tokenId] : undefined,
    enabled: optionType.tokenId !== undefined,
  });

  return {
    isLoading: optionTypeLoading || !optionType.ready,
    optionType,
    data,
  };
}
