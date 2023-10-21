import { ValoremProvider } from './ValoremProvider';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { WagmiProvider } from '../../test/WagmiProvider';
import { PropsWithChildren, useEffect } from 'react';
import { useSIWE } from 'connectkit';
import { useAccount, useConnect } from 'wagmi';

function TestWrapper({ children }: PropsWithChildren) {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  useEffect(() => {
    if (!isConnected) connect({ connector: connectors[0] });
  }, []);
  return (
    <div>
      <span>hi</span>
      <ValoremProvider
        siweConfig={{
          onSignIn(data) {
            console.log('onSignIn', data);
          },
          onSignOut() {
            console.log('onSignOut');
          },
        }}
      >
        {children}
      </ValoremProvider>
    </div>
  );
}

function TestInner() {
  const SIWE = useSIWE();
  const { signIn, signOut } = SIWE;

  return (
    <>
      <div data-testid="stringified">{JSON.stringify(SIWE)}</div>
      <button data-testid="sign-in" onClick={signIn}>
        Sign In
      </button>
      <button data-testid="sign-out" onClick={signOut}>
        Sign Out
      </button>
    </>
  );
}

function TestComponent() {
  return (
    <WagmiProvider>
      <TestWrapper>
        <TestInner />
      </TestWrapper>
    </WagmiProvider>
  );
}

describe.skip('SIWEProvider', () => {
  let siweStatus: string | null;
  let signInButton: HTMLElement | null;
  let signOutButton: HTMLElement | null;
  let renderResult: ReturnType<typeof render>;

  beforeEach(async () => {
    renderResult = render(<TestComponent />);
    const { findByTestId } = renderResult;
    siweStatus = (await findByTestId('stringified')).textContent;
    signInButton = await findByTestId('sign-in');
    signOutButton = await findByTestId('sign-out');
  });

  afterEach(() => {
    renderResult.unmount();
    siweStatus = null;
    signInButton = null;
    signOutButton = null;
  });

  it('mounts & loads', () => {
    expect(siweStatus).toEqual(
      '{"isSignedIn":false,"status":"ready","error":null,"isRejected":false,"isError":false,"isLoading":false,"isSuccess":false,"isReady":true}',
    );
  });

  it.skip('fails to sign in due to access pass', async () => {
    const errorSpy = vi.spyOn(console, 'error');
    const { findByTestId } = renderResult;
    signInButton?.click();

    await vi.waitUntil(
      async () =>
        !(await findByTestId('stringified')).textContent?.includes(
          '"isLoading":true,',
        ),
      { timeout: 2000 },
    );

    const newSIWEStatus = await findByTestId('stringified');

    expect(newSIWEStatus.textContent).not.toEqual(siweStatus);
    expect(errorSpy).toHaveBeenCalledWith(
      'signIn error',
      16,
      '[unauthenticated] Access denied: No Access Pass Found. "Address 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 does not hold access pass"',
    );

    // expect(
    //   newSIWEStatus.textContent.includes('"isSignedIn":true,'),
    // ).toBeTruthy();
  });
});
