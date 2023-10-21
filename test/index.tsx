import type { RenderHookOptions } from '@testing-library/react';
import {
  renderHook as defaultRenderHook,
  waitFor,
} from '@testing-library/react';
import { WagmiProvider } from './WagmiProvider';
import { FC, PropsWithChildren } from 'react';
import { ValoremProvider } from '../src';

const Wrapper: FC<PropsWithChildren> = ({ children }) => {
  return (
    <WagmiProvider>
      <ValoremProvider>{children}</ValoremProvider>
    </WagmiProvider>
  );
};

export function renderHook<TResult, TProps>(
  hook: (props: TProps) => TResult,
  {
    wrapper: wrapper_,
    ...options_
  }: RenderHookOptions<TProps> | undefined = {},
) {
  const options: RenderHookOptions<TProps> = {
    ...(wrapper_
      ? { wrapper: wrapper_ }
      : {
          wrapper: Wrapper,
        }),
    ...options_,
  };

  const utils = defaultRenderHook<TResult, TProps>(hook, options);
  return {
    ...utils,
    waitFor:
      (utils as { waitFor?: typeof waitFor } | undefined)?.waitFor ?? waitFor,
  };
}

export { act, cleanup } from '@testing-library/react';

// our mock USDC on Arbitrum Goerli
export const USDC_ADDRESS = '0x8AE0EeedD35DbEFe460Df12A20823eFDe9e03458';
// our mock Wrapped ETH on Arbitrum Goerli
export const WETH_ADDRESS = '0x618b9a2Db0CF23Bb20A849dAa2963c72770C1372';
