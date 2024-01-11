import type { Auth, H160, NonceText, SiweSession } from '@valorem-labs-inc/sdk';
import {
  createSIWEMessage as sdkCreateSIWEMessage,
  fromH160ToAddress,
  fromH256,
} from '@valorem-labs-inc/sdk';
import type { SIWEConfig } from 'connectkit';
import type { PromiseClient } from '@connectrpc/connect';
import type { QueryClient } from '@tanstack/query-core';
import type { UseQueryResult } from '@tanstack/react-query';
import type { useLogger } from '../context/Logger';

const createSIWEMessage: SIWEConfig['createMessage'] = ({
  chainId,
  address,
  nonce,
}) => {
  const message = sdkCreateSIWEMessage({
    chainId,
    address: address as `0x${string}`,
    nonce,
  });
  if (typeof window === 'undefined') {
    return message;
  }
  const domain = window.location.host;
  return message.replace('trade.valorem.xyz wants', `${domain} wants`);
};

/**
 * Defines the structure for SIWE configuration properties.
 */
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

/**
 * Creates a configuration object for Sign-In with Ethereum.
 * It enables the application to define the SIWE process, including
 * nonce generation, message verification, session management, and sign-out.
 *
 * @param props - The properties for generating the SIWE config.
 * @returns - The configuration object for the SIWE process.
 */
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
    // Provide a message creation function for the SIWE message.
    createMessage: createSIWEMessage,

    // Returns a promise which, upon resolution, returns the nonce.
    async getNonce() {
      logger.debug('Fetching nonce...');
      const { data } = await nonceQuery.refetch();
      if (data?.nonce === undefined) throw new Error('Could not fetch nonce');
      logger.debug(`Current nonce: ${data.nonce}`);
      return data.nonce;
    },

    // Returns a promise which, upon resolution, verifies the contents of the SIWE message.
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

    // Returns a promise which, upon resolution and disconnect/reconnect of the
    // client terminates the SIWE session.
    async signOut() {
      logger.debug('Signing out...');
      try {
        await signOutQuery.refetch();
        logger.info('Signed out');
        return true;
      } catch (error) {
        logger.error('Error signing out');
        return false;
      }
    },

    // Returns a promise which, upon await, gets details about the current session.
    async getSession() {
      logger.debug('Getting session...');

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
