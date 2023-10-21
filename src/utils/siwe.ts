import { createSIWEMessage, fromH160ToAddress } from '@valorem-labs-inc/sdk';
import type { SIWEConfig } from 'connectkit';
import type { PromiseClient } from '@connectrpc/connect';
import type { Auth } from '../lib';
import type { useLogger } from '../context/Logger';

interface GetSIWEConfigProps {
  authClient: PromiseClient<typeof Auth>;
  address: string | undefined;
  chainId: number | undefined;
  logger: ReturnType<typeof useLogger>;
}

export const getSIWEConfig = ({
  authClient,
  address,
  chainId,
  logger,
}: GetSIWEConfigProps): SIWEConfig => {
  const getNonce = async () => {
    try {
      await authClient.authenticate({});
    } catch (error) {
      const { nonce } = await authClient.nonce({});
      return nonce;
    }
  };
  const config: SIWEConfig = {
    enabled: true,
    nonceRefetchInterval: 0, // don't refetch nonce as it will create a new session
    sessionRefetchInterval: 60 * 60 * 1000, // 1 hour
    signOutOnAccountChange: true,
    signOutOnDisconnect: true,
    signOutOnNetworkChange: false,
    createMessage: createSIWEMessage as SIWEConfig['createMessage'],
    getNonce: getNonce as () => Promise<string>,
    async verifyMessage({ message, signature }) {
      const res = await authClient.verify({
        body: JSON.stringify({ message, signature }),
      });
      // verify address returned by Trade API matches current address
      const verifiedAddress = fromH160ToAddress(res).toLowerCase();
      return verifiedAddress === address?.toLowerCase();
    },
    async signOut() {
      await authClient.nonce({});
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
