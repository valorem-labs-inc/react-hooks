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
  wagmiQueryClient: QueryClient;
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
  wagmiQueryClient,
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
      logger.debug('SIWE: Fetching nonce...');
      const { data } = await nonceQuery.refetch();
      if (data?.nonce === undefined) throw new Error('Could not fetch nonce');
      logger.debug(`SIWE: Current nonce: ${data.nonce}`);
      return data.nonce;
    },

    // Returns a promise which, upon resolution, verifies the contents of the SIWE message.
    async verifyMessage({ message, signature }) {
      logger.debug('SIWE: Verifying message...');

      let verified = false;
      try {
        const res = await authClient.verify({
          body: JSON.stringify({ message, signature }),
        });
        // verify address returned by Trade API matches current address
        const verifiedAddress = fromH160ToAddress(res).toLowerCase();
        logger.info('SIWE: Signed in');
        verified = verifiedAddress === address?.toLowerCase();
      } catch (error) {
        logger.error('SIWE: Error verifying message', { error });
      }

      if (!verified) {
        logger.warn('SIWE: Fetching new nonce after failed verification...');
        await wagmiQueryClient.refetchQueries(['ckSiweNonce']);
      }

      return verified;
    },

    // Returns a promise which, upon resolution and disconnect/reconnect of the
    // client terminates the SIWE session.
    async signOut() {
      logger.debug('SIWE: Signing out...');
      try {
        await signOutQuery.refetch();
        logger.info('SIWE: Signed out');
        return true;
      } catch (error) {
        logger.error('SIWE: Error signing out', { error });
        return false;
      }
    },

    // Returns a promise which, upon await, gets details about the current session.
    async getSession() {
      logger.debug('SIWE: Getting session...');
      try {
        // check auth endpoint to ensure session is valid
        const { data: authData, error: authError } =
          await authenticateQuery.refetch({});
        if (authData === undefined || authError !== null) {
          logger.debug('SIWE: Could not get auth data', { authError });
          return null;
        }
        const authorizedAddress = fromH160ToAddress(authData);
        if (authorizedAddress.toLowerCase() !== address?.toLowerCase()) {
          logger.error(
            'SIWE: Authorized address does not match connected address',
          );
          return null;
        }
        logger.debug(
          'SIWE: Authorized address matches connected address. Now checking /session endpoint.',
        );

        // get session data
        const { data: sessionData, error: sessionError } =
          await sessionQuery.refetch();
        if (
          !sessionData?.address ||
          !sessionData.chainId ||
          sessionError !== null
        ) {
          logger.debug('SIWE: No session data found', { sessionError });
          return null;
        }
        const sessionAddress = fromH160ToAddress(sessionData.address);
        if (sessionAddress.toLowerCase() === address.toLowerCase()) {
          logger.debug('SIWE: Session is valid');
          return {
            address: sessionAddress,
            chainId: Number(fromH256(sessionData.chainId).toString()),
          };
        }

        logger.error('SIWE: Auth route does not match session data');
        return null;
      } catch (error) {
        logger.error('SIWE: Error getting session', { error });
        return null;
      }
    },
  };
  return config;
};
