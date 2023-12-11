import type { PropsWithChildren } from 'react';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { arbitrumGoerli } from 'viem/chains';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { MockConnector } from 'wagmi/connectors/mock';

/**
 * Sets up the chains and providers for the Wagmi configuration.
 * Uses the publicProvider as the default provider for transactions.
 */
const { publicClient, webSocketPublicClient } = configureChains(
  [arbitrumGoerli],
  [publicProvider()],
);

/**
 * A private key used to mock a wallet client for testing purposes.
 * WARNING: This key should only be used for automated tests.
 */
const PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * MockConnector simulates a wallet connection for testing environments.
 * It creates a wallet client with a given private key and associated chain.
 */
const mockConnector = new MockConnector({
  chains: [arbitrumGoerli],
  options: {
    walletClient: createWalletClient({
      chain: arbitrumGoerli,
      account: privateKeyToAccount(PRIVATE_KEY),
      transport: http(),
    }),
  },
});

/**
 * The Wagmi configuration object, which includes the mock connector
 * and sets autoConnect to true for immediate wallet simulation.
 */
const config = createConfig({
  connectors: [mockConnector],
  autoConnect: true,
  publicClient,
  webSocketPublicClient,
});

/**
 * WagmiProvider component that sets up the Wagmi context with the provided configuration.
 * This allows the children components to interact with blockchain via Wagmi hooks and utils.
 *
 * @param {PropsWithChildren} props - The children components that will have access to Wagmi context.
 * @returns A WagmiConfig provider wrapping the children components.
 */
export function WagmiProvider({ children }: PropsWithChildren) {
  return <WagmiConfig config={config}>{children}</WagmiConfig>;
}
