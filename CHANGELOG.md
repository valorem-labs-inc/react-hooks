# @valorem-labs-inc/react-hooks

## 0.0.8

### Patch Changes

- 8109a48: fix CI workflow for NPM publishing
- 016a055: drop parcel for tsup...
- 3ebc40d: add arbitrum sepolia deployments; drop arbitrum goerli
- 6580e92: add `useIsGeofenced` hook
- 717e435: fix SIWE `Unknown Error` bug
- 31bdd4b: use `window.location.host` in creation of SIWE message
- 19ecb4a: pin `trade-interfaces` to v1.4.0
- e3015bb: update `onResponse` props in useRFQ/useSoftQuote

## 0.0.7

### Patch Changes

- refactor useStream to make better use of react-query
- decrease SIWE session refetch interval

## 0.0.6

### Patch Changes

- update wagmi to v1.4.12

## 0.0.5

### Patch Changes

- update hooks with clear foundry address
- 0771616: export soft quote
- add pnpm audit to workflow
- add parameter to configure GRPC endpoint
- 77a8c27: fix: SIWE provider sign out

## 0.0.4

### Patch Changes

- fix: infinite re-render
- fix: peer dependencies

## 0.0.3

### Patch Changes

- chore: update trade-interfaces
  use new auth routes

## 0.0.2

### Patch Changes

- chore: update release process
  drop tsup for parcel
  update workflow to deploy to npm and github packages
