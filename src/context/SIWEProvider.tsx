import type { SIWESession } from 'connectkit';
import { SIWEProvider as Provider } from 'connectkit';
import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  enabled: true,
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
  const queryClient = useQueryClient();

  // Queries for nonce, authentication, session, and sign-out.
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

  // Configuration for the SIWE process.
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

  // Return null while nonce is initially loading.
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
