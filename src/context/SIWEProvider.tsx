import type { SIWESession } from 'connectkit';
import { SIWEProvider as Provider } from 'connectkit';
import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSIWEConfig } from '../utils/siwe';
import { usePromiseClient } from '../hooks/usePromiseClient';
import { Auth, nonce, authenticate, session, signOut } from '../lib';
import { useLogger } from './Logger';

export interface SIWEProps extends PropsWithChildren {
  onSignIn?: (data?: SIWESession) => void;
  onSignOut?: () => void;
}

const siweQueryProps = {
  enabled: true,
  refetchInterval: 0,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  keepPreviousData: false,
  cacheTime: 0,
  staleTime: 1,
};

export function SIWEProvider({ onSignIn, onSignOut, children }: SIWEProps) {
  const { address } = useAccount();
  const logger = useLogger();
  const authClient = usePromiseClient(Auth);
  const queryClient = useQueryClient();

  const nonceQuery = useQuery({
    ...nonce.useQuery({}),
    ...siweQueryProps,
    enabled: false,
  });

  const authenticateQuery = useQuery({
    ...authenticate.useQuery({}),
    ...siweQueryProps,
  });

  const sessionQuery = useQuery({
    ...session.useQuery({}),
    ...siweQueryProps,
  });

  const signOutQuery = useQuery({
    ...signOut.useQuery({}),
    ...siweQueryProps,
    enabled: false,
  });

  const siweConfig = useMemo(() => {
    return getSIWEConfig({
      authClient,
      queryClient,
      nonceQuery,
      authenticateQuery,
      sessionQuery,
      signOutQuery,
      address,
      logger,
    });
  }, [
    authClient,
    queryClient,
    nonceQuery,
    authenticateQuery,
    sessionQuery,
    signOutQuery,
    address,
    logger,
  ]);

  if (nonceQuery.isInitialLoading) return null;

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
