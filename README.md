# Valorem React Hooks

Valorem is a DeFi protocol enabling physically settled or cash settled, American, European, and Exotic options.
The Valorem React Hooks package wraps Valorem's signature relay, Seaport and Clear contract interfaces into hooks consumable by any React frontend.

## Documentation

- TODO: Link documentation here

## Installation

Install the package:

```bash
yarn add @valorem/react-hooks
```

## Getting Started

Utilizing the reat-hooks package requires an RPC provider:

```js
import ValoremReactHooks, { Network } from '@valorem/react-hooks';

const hooksProvider = new ValoremHooks({
  network: Network.Ethereum,
  provider: 'https://eth-archival.gateway.pokt.network/v1/lb/<APP_ID>',
});
```

## Development
