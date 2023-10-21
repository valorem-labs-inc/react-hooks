import type { SIWESession } from 'connectkit';
import { SIWEProvider as Provider } from 'connectkit';
import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { useAccount, useNetwork } from 'wagmi';
import { getSIWEConfig } from '../utils/siwe';
import { usePromiseClient } from '../hooks/usePromiseClient';
import { Auth } from '../lib';
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

  const siweConfig = useMemo(() => {
    return getSIWEConfig({ authClient, address, chainId: chain?.id, logger });
  }, [authClient, address, chain?.id, logger]);

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
