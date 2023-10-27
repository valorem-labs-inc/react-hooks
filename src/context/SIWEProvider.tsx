import type { SIWESession } from 'connectkit';
import { SIWEProvider as Provider } from 'connectkit';
import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { useAccount, useNetwork } from 'wagmi';
import { Auth } from '@valorem-labs-inc/sdk';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSIWEConfig } from '../utils/siwe';
import { usePromiseClient } from '../hooks/usePromiseClient';
import { nonce } from '../lib';
import { useLogger } from './Logger';

export interface SIWEProps extends PropsWithChildren {
  onSignIn?: (data?: SIWESession) => void;
  onSignOut?: () => void;
}

export function SIWEProvider({ onSignIn, onSignOut, children }: SIWEProps) {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const logger = useLogger();
  const authClient = usePromiseClient(Auth);
  const queryClient = useQueryClient();

  const { refetch: refetchNonce, isInitialLoading } = useQuery({
    ...nonce.useQuery({}),
    enabled: true,
    refetchInterval: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const siweConfig = useMemo(() => {
    return getSIWEConfig({
      authClient,
      queryClient,
      refetchNonce,
      address,
      chainId: chain?.id,
      logger,
    });
  }, [authClient, queryClient, refetchNonce, address, chain?.id, logger]);

  if (isInitialLoading) return null;

  return (
    <Provider
      onSignIn={onSignIn}
      onSignOut={() => {
        onSignOut?.();
      }}
      {...siweConfig}
    >
      {children}
    </Provider>
  );
}
