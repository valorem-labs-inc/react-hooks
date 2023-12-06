import type { NonceText } from '@valorem-labs-inc/sdk';
import {
  createSIWEMessage,
  fromH160ToAddress,
  fromH256,
} from '@valorem-labs-inc/sdk';
import type { SIWEConfig } from 'connectkit';
import type { PromiseClient } from '@connectrpc/connect';
import type { QueryClient } from '@tanstack/query-core';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Auth } from '../lib';
import type { SiweSession } from '../lib/codegen/auth_pb';
import type { H160 } from '../lib/codegen/types_pb';
import type { useLogger } from '../context/Logger';

interface GetSIWEConfigProps {
  authClient: PromiseClient<typeof Auth>;
  queryClient: QueryClient;
  nonceQuery: UseQueryResult<NonceText>;
  authenticateQuery: UseQueryResult<H160>;
  sessionQuery: UseQueryResult<SiweSession>;
  signOutQuery: UseQueryResult<SiweSession>;
  address: string | undefined;
  logger: ReturnType<typeof useLogger>;
}

export const getSIWEConfig = ({
  authClient,
  queryClient,
  nonceQuery,
  authenticateQuery,
  sessionQuery,
  signOutQuery,
  address,
  logger,
}: GetSIWEConfigProps): SIWEConfig => {
  const config: SIWEConfig = {
    enabled: true,
    nonceRefetchInterval: 0, // don't refetch nonce as it will create a new session
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
        logger.debug('Fetching nonce...');
        const { data } = await nonceQuery.refetch();
        if (data?.nonce === undefined) throw new Error('Could not fetch nonce');
        nonce = data.nonce;
      }
      logger.debug(`Current nonce: ${nonce}`);
      return nonce;
    },
    async verifyMessage({ message, signature }) {
      logger.debug('Verifying message...');
      const res = await authClient.verify({
        body: JSON.stringify({ message, signature }),
      });
      // verify address returned by Trade API matches current address
      const verifiedAddress = fromH160ToAddress(res).toLowerCase();
      logger.debug('Message verified successfully');
      return verifiedAddress === address?.toLowerCase();
    },
    async signOut() {
      logger.debug('Signing out...');
      try {
        await signOutQuery.refetch();
        queryClient.setQueryData(['valorem.trade.v1.Auth', 'Nonce'], undefined);
        queryClient.setQueryData(
          ['valorem.trade.v1.Auth', 'Session'],
          undefined,
        );
        queryClient.setQueryData(
          ['valorem.trade.v1.Auth', 'Authenticate'],
          undefined,
        );
        queryClient.setQueryData(['valorem.trade.v1.Auth', 'signed-out'], true);
        logger.info('Signed out');
        return true;
      } catch (error) {
        logger.error('Error signing out');
        return false;
      }
    },
    async getSession() {
      logger.debug('Getting session...');
      await new Promise((resolve) => {
        setTimeout(resolve, 250);
      });
      if (
        queryClient.getQueryData(['valorem.trade.v1.Auth', 'signed-out']) ===
        true
      ) {
        logger.debug('User is signed out');
        queryClient.setQueryData(
          ['valorem.trade.v1.Auth', 'signed-out'],
          false,
        );
        return null;
      }
      queryClient.setQueryData(['valorem.trade.v1.Auth', 'Nonce'], undefined);
      queryClient.setQueryData(['valorem.trade.v1.Auth', 'Session'], undefined);
      queryClient.setQueryData(
        ['valorem.trade.v1.Auth', 'Authenticate'],
        undefined,
      );

      // check auth endpoint to ensure session is valid
      const { data: authData } = await authenticateQuery.refetch({});
      if (authData === undefined) {
        logger.warn('Could not get auth data');
        return null;
      }
      const authorizedAddress = fromH160ToAddress(authData);
      if (authorizedAddress.toLowerCase() !== address?.toLowerCase()) {
        logger.error('Authorized address does not match connected address');
        return null;
      }
      // get session data
      const { data: sessionData } = await sessionQuery.refetch();
      if (!sessionData?.address || !sessionData.chainId) {
        logger.warn('No session data found');
        return null;
      }
      const sessionAddress = fromH160ToAddress(sessionData.address);
      if (sessionAddress.toLowerCase() === address.toLowerCase()) {
        logger.debug('Session is valid');
        queryClient.setQueryData(
          ['valorem.trade.v1.Auth', 'signed-out'],
          false,
        );
        return {
          address: sessionAddress,
          chainId: Number(fromH256(sessionData.chainId).toString()),
        };
      }

      logger.error('Auth route does not match session data');
      return null;
    },
  };
  return config;
};
