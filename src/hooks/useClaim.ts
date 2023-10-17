import { Claim } from '@nickadamson/sdk';
import { useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { useClearClaim } from '../lib/codegen/wagmi';

export function useClaim({ claimId }: { claimId: bigint }) {
  const publicClient = usePublicClient();

  const claim = useMemo(() => {
    return new Claim({ claimId, publicClient });
  }, [claimId, publicClient]);

  const { data, isLoading: claimLoading } = useClearClaim({
    args: [claimId],
  });

  return {
    isLoading: claimLoading || !claim.ready,
    claim,
    data,
  };
}
