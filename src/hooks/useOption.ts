import { Option } from '@nickadamson/sdk';
import { usePublicClient } from 'wagmi';
import { useMemo } from 'react';
import { useClearOption } from '../lib/codegen/wagmi';

export function useOption({ optionId }: { optionId: bigint }) {
  const publicClient = usePublicClient();

  const option = useMemo(() => {
    return new Option({ optionId, publicClient });
  }, [optionId, publicClient]);

  const { data, isLoading: optionLoading } = useClearOption({
    args: option.optionTypeId ? [option.optionTypeId] : undefined,
    enabled: option.optionTypeId !== undefined,
  });

  return {
    isLoading: optionLoading || !option.ready,
    option,
    data,
  };
}
