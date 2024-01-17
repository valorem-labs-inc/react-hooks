import { SIWEProvider as Provider, type SIWESession } from 'connectkit';
import { type PropsWithChildren, useMemo } from 'react';
import { useAccount, useQueryClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { getSIWEConfig } from '../utils/siwe';
import { usePromiseClient } from '../hooks/usePromiseClient';
import {
  signOut,
  session,
  authenticate,
  nonce,
  Auth,
} from '../lib/codegen/auth-Auth_connectquery';
import { useLogger } from './Logger';

/**
 * Type definition for SIWEProps.
 */
export interface SIWEProps extends PropsWithChildren {
  onSignIn?: (data?: SIWESession) => void;
  onSignOut?: () => void;
}

// Configuration for SIWE queries.
const siweQueryProps = {
  enabled: false,
  refetchInterval: 0,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  keepPreviousData: false,
  cacheTime: 0,
  staleTime: 1,
};

/**
 * Provides a context for Sign-In With Ethereum (SIWE) functionality.
 *
 * @param props - The component properties.
 * @returns A React component providing SIWE context.
 */
export function SIWEProvider({ onSignIn, onSignOut, children }: SIWEProps) {
  const { address } = useAccount();
  const logger = useLogger();
  const authClient = usePromiseClient(Auth);
  const wagmiQueryClient = useQueryClient();

  // Queries for authentication, nonce, session, and sign-out.
  const authenticateQuery = useQuery({
    ...authenticate.useQuery({}),
    ...siweQueryProps,
    enabled: true,
    refetchOnMount: true,
    retry: false,
  });

  const nonceQuery = useQuery({
    ...nonce.useQuery({}),
    ...siweQueryProps,
  });

  const sessionQuery = useQuery({
    ...session.useQuery({}),
    ...siweQueryProps,
  });

  const signOutQuery = useQuery({
    ...signOut.useQuery({}),
    ...siweQueryProps,
  });

  const SIWEConfig = useMemo(() => {
    return getSIWEConfig({
      authClient,
      wagmiQueryClient,
      nonceQuery,
      authenticateQuery,
      sessionQuery,
      signOutQuery,
      address,
      logger,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- don't want to recompute when logger changes
  }, [
    authClient,
    wagmiQueryClient,
    nonceQuery,
    authenticateQuery,
    sessionQuery,
    signOutQuery,
    address,
    /* logger, */
  ]);

  // wait for authenticate query to finish before mounting SIWEProvider
  // this prevents a set-cookie race condition on the auth routes
  if (!authenticateQuery.isFetchedAfterMount) {
    return null;
  }

  return (
    <Provider
      onSignIn={onSignIn}
      onSignOut={() => {
        onSignOut?.();
      }}
      {...SIWEConfig}
    >
      {children}
    </Provider>
  );
}
