# Valorem React Hooks

> This package provides React hooks for seamless integration with the Valorem
> DeFi protocol, enabling the creation of sophisticated financial applications.
> This API is not yet stable and subject to change

## Table of Contents

- [Background](#background)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Hooks API](#hooks-api)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Background

Valorem, a versatile DeFi protocol, supports physically and cash-settled
options trading, including American, European, and Exotic types. The React
Hooks package encapsulates interactions with Valorem's signature relay,
Seaport, and Clear contract interfaces, offering a set of hooks for
intuitive use within any React frontend.

## Installation

To install the package, choose one of the following commands based on your package manager:

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

## Usage

You can use the provided hooks in any component within your app. Here's an example of using
useRFQ and useSeaportFulfillOrder:

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

## Hooks API

The package offers several hooks for various aspects of options trading:

- useRFQ: Request for quote from market makers.
- useSeaportFulfillOrder: Fulfill an order via Seaport.
  Each hook is designed to be intuitive and easy to integrate, abstracting away
  the complexities of the blockchain interactions.

## Development

For local development:

Install dependencies: `pnpm i`
Format code: `pnpm format`
Lint code: `pnpm lint`
Run tests: `pnpm test`
Build the package: `pnpm build`

## Development

Install dependencies with `pnpm i`, run tests with `pnpm test`, and build with `pnpm build`.

## Contributing

Contributions are welcome.

## License

g
This project is licensed under MIT License. Full license text is available in the LICENSE file.
