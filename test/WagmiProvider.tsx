import type { PropsWithChildren } from 'react';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { arbitrumGoerli } from 'viem/chains';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { MockConnector } from 'wagmi/connectors/mock';

const { publicClient, webSocketPublicClient } = configureChains(
  [arbitrumGoerli],
  [publicProvider()],
);

const PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

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

const config = createConfig({
  connectors: [mockConnector],
  autoConnect: true,
  publicClient,
  webSocketPublicClient,
});

export function WagmiProvider({ children }: PropsWithChildren) {
  return <WagmiConfig config={config}>{children}</WagmiConfig>;
}
