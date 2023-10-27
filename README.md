This is a work in progress. The API is not yet stable, and is subject to change, including breaking changes. Contributions welcome.

# Valorem React Hooks

Valorem is a DeFi protocol enabling physically settled or cash settled, American, European, and Exotic options.
The Valorem React Hooks package wraps Valorem's signature relay, Seaport and Clear contract interfaces into hooks consumable by any React frontend.

## Documentation

For documentation, visit [https://valorem-labs-inc.github.io/react-hooks/](https://valorem-labs-inc.github.io/react-hooks/)

## Installation

```bash
npm i @valorem-labs-inc/react-hooks
```

```bash
pnpm i @valorem-labs-inc/react-hooks
```

```bash
yarn add @valorem-labs-inc/react-hooks
```

## Getting Started

Wrap your app in the `ValoremProvider`. This should be done inside of a `WagmiConfig` provider:

```tsx
import { ValoremProvider } from '@valorem-labs-inc/react-hooks';
import { WagmiConfig } from 'wagmi';

function App() {
  return (
    <WagmiConfig config={/* see https://wagmi.sh/react/getting-started */}>
      <ValoremProvider>{children}</ValoremProvider>
    </WagmiConfig>
  );
}
```

Now you can use the hooks anywhere in your app:

```tsx
import { QuoteRequest, NULL_BYTES32 } from '@valorem-labs-inc/sdk';
import { useRFQ, useSeaportFulfillOrder } from '@valorem-labs-inc/react-hooks';

const quoteRequest = new QuoteRequest({
  // your quote request parameters
});

function Component() {
  const { quotes } = useRFQ({ quoteRequest });

  const bestQuote = useMemo(() => {
    if (!quotes) return undefined;

    // add your own logic to filter through offers

    return quotes[0];
  }, [quotes]);

  const { config } = usePrepareSeaportFulfillOrder({
    args:
      bestQuote !== undefined
        ? [
            {
              parameters: bestQuote.order.parameters,
              signature: bestQuote.order.signature,
            },
            NULL_BYTES32,
          ]
        : undefined,
    enabled: bestQuote !== undefined,
  });

  const { write, isLoading } = useSeaportFulfillOrder({
    ...config,
    async onSuccess({ hash }) {
      const { status, transactionHash } = await waitForTransaction({ hash });

      /* ... */
    },
  });

  return (
    <>
      <button
        onClick={write}
        disabled={write === undefined || isLoading === true}
      >
        {bestQuote === undefined
          ? 'Waiting for an RFQ response...'
          : 'Fulfill Order'}
      </button>
    </>
  );
}
```

## Development

Install dependencies with `pnpm i`, run tests with `pnpm test`, and build with `pnpm build`.
