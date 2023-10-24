import type { NonceText } from '@valorem-labs-inc/sdk';
import { createSIWEMessage, fromH160ToAddress } from '@valorem-labs-inc/sdk';
import type { SIWEConfig } from 'connectkit';
import type { ConnectError, PromiseClient } from '@connectrpc/connect';
import type { QueryClient, QueryObserverResult } from '@tanstack/query-core';
import type { Auth } from '../lib';
import type { useLogger } from '../context/Logger';

interface GetSIWEConfigProps {
  authClient: PromiseClient<typeof Auth>;
  queryClient: QueryClient;
  refetchNonce: () => Promise<QueryObserverResult<NonceText, ConnectError>>;
  address: string | undefined;
  chainId: number | undefined;
  logger: ReturnType<typeof useLogger>;
}

export const getSIWEConfig = ({
  authClient,
  queryClient,
  refetchNonce,
  address,
  chainId,
  logger,
}: GetSIWEConfigProps): SIWEConfig => {
  const config: SIWEConfig = {
    enabled: true,
    nonceRefetchInterval: 0, // don't refetch nonce as it will create a new session
    sessionRefetchInterval: 60 * 60 * 1000, // 1 hour
    signOutOnAccountChange: true,
    signOutOnDisconnect: true,
    signOutOnNetworkChange: false,
    createMessage: createSIWEMessage as SIWEConfig['createMessage'],
    async getNonce() {
      let nonce: string | undefined = queryClient.getQueryData([
        'valorem.trade.v1.Auth',
        'Nonce',
      ]);
      if (nonce === undefined) {
        const { data } = await refetchNonce();
        if (data?.nonce === undefined) throw new Error('Could not fetch nonce');
        nonce = data.nonce;
      }
      return nonce;
    },
    async verifyMessage({ message, signature }) {
      const res = await authClient.verify({
        body: JSON.stringify({ message, signature }),
      });
      // verify address returned by Trade API matches current address
      const verifiedAddress = fromH160ToAddress(res).toLowerCase();
      return verifiedAddress === address?.toLowerCase();
    },
    async signOut() {
      await refetchNonce();
      return true;
    },
    async getSession() {
      // wait for sign out to occur
      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });

      try {
        const res = await authClient.authenticate({});
        const verifiedAddress = fromH160ToAddress(res).toLowerCase();
        const isValidSession = verifiedAddress === address?.toLowerCase();
        if (!isValidSession) return null;
        logger.debug('returning valid session');
        return { address, chainId } as { address: string; chainId: number };
      } catch (error) {
        return null;
      }
    },
  };
  return config;
};
