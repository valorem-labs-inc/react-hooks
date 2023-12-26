import type { Auth, H160, NonceText, SiweSession } from '@valorem-labs-inc/sdk';
import {
  createSIWEMessage,
  fromH160ToAddress,
  fromH256,
} from '@valorem-labs-inc/sdk';
import type { SIWEConfig } from 'connectkit';
import type { PromiseClient } from '@connectrpc/connect';
import type { QueryClient } from '@tanstack/query-core';
import type { UseQueryResult } from '@tanstack/react-query';
import type { useLogger } from '../context/Logger';

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
 * Factory function to create a configuration object for Sign-In with Ethereum (SIWE).
 * The function orchestrates the SIWE process, including nonce generation,
 * message verification, session management, and sign-out functionality.
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
  // Helper functions to clear cached query data.
  const clearNonceQuery = () => {
    queryClient.setQueryData(['valorem.trade.v1.Auth', 'Nonce'], undefined);
  };
  const clearAuthQuery = () => {
    queryClient.setQueryData(
      ['valorem.trade.v1.Auth', 'Authenticate'],
      undefined,
    );
  };
  const clearSessionQuery = () => {
    queryClient.setQueryData(['valorem.trade.v1.Auth', 'Session'], undefined);
  };

  // check auth endpoint to ensure session is valid
  const checkAuth = async () => {
    clearAuthQuery();
    const { data: authData } = await authenticateQuery.refetch({});
    if (authData === undefined) {
      logger.warn('Could not get auth data');
      return false;
    }
    // verify address
    const authorizedAddress = fromH160ToAddress(authData);
    if (authorizedAddress.toLowerCase() !== address?.toLowerCase()) {
      logger.error('Authorized address does not match connected address');
      return false;
    }
    return true;
  };

  const config: SIWEConfig = {
    // Indicate whether the SIWE process is enabled.
    enabled: true,
    // Specify the nonce refetch interval. Set to 0 to prevent creating new sessions.
    nonceRefetchInterval: 0,
    // Determines the session refetch interval.
    sessionRefetchInterval: 60 * 1000 * 2, // 2 minutes
    // Determines whether to sign out on account change.
    signOutOnAccountChange: true,
    // Determines whether to sign out on disconnect.
    signOutOnDisconnect: true,
    // Determines whether to sign out on network change.
    signOutOnNetworkChange: false,
    // Provide a message creation function for the SIWE message.
    createMessage: createSIWEMessage as SIWEConfig['createMessage'],

    // Function to fetch or retrieve the existing nonce.
    // Incorporates a check to ensure nonce is only fetched when needed.
    async getNonce() {
      // check if nonce already exists
      const existingNonce: string | undefined = queryClient.getQueryData([
        'valorem.trade.v1.Auth',
        'Nonce',
      ]);

      // check if fetching nonce is needed
      if (existingNonce === undefined) {
        const authorized = await checkAuth();
        if (!authorized) {
          logger.debug('Fetching nonce...');
          const { data } = await nonceQuery.refetch();
          if (data?.nonce !== undefined) {
            return data.nonce;
          }
        }
      } else {
        logger.debug('Nonce already exists');
        return existingNonce;
      }

      // if nonce is still undefined, throw error
      throw new Error('Could not fetch nonce');
    },

    //  Returns a promise which, upon resolution, verifies the contents of the SIWE message.
    // Clears the nonce query and sets 'signed-out' to false before verification.
    async verifyMessage({ message, signature }) {
      queryClient.setQueryData(['valorem.trade.v1.Auth', 'signed-out'], false);
      clearNonceQuery();

      logger.debug('Verifying message...');
      const res = await authClient.verify({
        body: JSON.stringify({ message, signature }),
      });
      // verify address returned by Trade API matches current address
      const verifiedAddress = fromH160ToAddress(res).toLowerCase();
      logger.debug('Message verified successfully');
      return verifiedAddress === address?.toLowerCase();
    },

    // Returns a promise which, upon resolution and disconnect/reconnect of the client terminates the SIWE session.
    // Clears the nonce, authentication, and session queries upon successful sign out.
    async signOut() {
      logger.debug('Signing out...');
      try {
        await signOutQuery.refetch();
        queryClient.setQueryData(['valorem.trade.v1.Auth', 'signed-out'], true);
        clearNonceQuery();
        clearAuthQuery();
        clearSessionQuery();
        logger.info('Signed out');
        return true;
      } catch (error) {
        logger.error('Error signing out');
        return false;
      }
    },

    // Returns a promise which, upon await, gets details about the current session.
    // Clears session data if any checks fail and returns null to indicate no valid session.
    async getSession() {
      logger.debug('Getting session...');
      clearSessionQuery();

      // check if signed out
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
      // get session data
      const { data: sessionData } = await sessionQuery.refetch();

      if (!sessionData?.address || !sessionData.chainId) {
        logger.warn('No session data found');
        return null;
      }
      // verify address
      const sessionAddress = fromH160ToAddress(sessionData.address);
      if (sessionAddress.toLowerCase() === address?.toLowerCase()) {
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
