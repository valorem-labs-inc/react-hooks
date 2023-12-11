import type { RenderHookOptions } from '@testing-library/react';
import {
  renderHook as defaultRenderHook,
  waitFor,
} from '@testing-library/react';
import { WagmiProvider } from './WagmiProvider';
import { FC, PropsWithChildren } from 'react';
import { ValoremProvider } from '../src/context';
import { LogLevel } from '../src/context/Logger';

/**
 * A wrapper component that encapsulates the ValoremProvider within the WagmiProvider.
 * It sets the log level for the ValoremProvider to Debug for detailed logging during testing.
 *
 * @param props - Props that include children components.
 * @returns - A React functional component that provides the necessary context providers for Valorem.
 */
const Wrapper: FC<PropsWithChildren> = ({ children }) => {
  return (
    <WagmiProvider>
      <ValoremProvider logLevel={LogLevel.Debug}>{children}</ValoremProvider>
    </WagmiProvider>
  );
};

/**
 * Custom renderHook function that wraps the testing library's renderHook to include Valorem and Wagmi providers.
 * This allows custom hooks to be tested within the appropriate context.
 *
 * @param hook - The custom hook to be tested.
 * @param wrapper_
 * @param [options_] - Optional parameters for the renderHook function.
 * @returns An extended utility object from the testing library's renderHook that includes a waitFor method.
 */
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

// Re-export act and cleanup from the testing library for convenience.
export { act, cleanup } from '@testing-library/react';

// Addresses for mock USDC and WETH on Arbitrum Goerli used for testing purposes.
export const USDC_ADDRESS = '0x8AE0EeedD35DbEFe460Df12A20823eFDe9e03458';
export const WETH_ADDRESS = '0x618b9a2Db0CF23Bb20A849dAa2963c72770C1372';
