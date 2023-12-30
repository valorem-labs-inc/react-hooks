import {
  CLEAR_ABI,
  CLEAR_ADDRESS,
  SEAPORT_V1_5_ABI,
  SEAPORT_ADDRESS,
  SEAPORT_VALIDATOR_ABI,
  VALIDATOR_ADDRESS,
} from '@valorem-labs-inc/sdk';
import { defineConfig } from '@wagmi/cli';
import { erc20ABI } from 'wagmi';
import { react } from '@wagmi/cli/plugins';

const FOUNDRY_CLEAR_ADDRESS = '0x9f13A8276F0cc1e85F0f62c67Cf9f4f940d7D20d';

export default defineConfig({
  out: 'src/lib/codegen/wagmi.ts',
  contracts: [
    {
      name: 'Clear',
      address: {
        1: CLEAR_ADDRESS,
        42161: CLEAR_ADDRESS,
        421614: CLEAR_ADDRESS,
        31337: FOUNDRY_CLEAR_ADDRESS,
      },
      abi: CLEAR_ABI,
    },
    {
      name: 'Seaport',
      address: SEAPORT_ADDRESS,
      abi: SEAPORT_V1_5_ABI,
    },
    {
      name: 'SeaportValidator',
      address: VALIDATOR_ADDRESS,
      abi: SEAPORT_VALIDATOR_ABI,
    },
    {
      name: 'ERC20',
      abi: erc20ABI,
    },
  ],
  plugins: [
    react({
      useContractEvent: false,
      useContractItemEvent: false,
      useContractRead: false,
      useContractFunctionRead: true,
      useContractWrite: false,
      useContractFunctionWrite: true,
      usePrepareContractWrite: false,
      usePrepareContractFunctionWrite: true,
    }),
  ],
});
