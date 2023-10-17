import {
  CLEAR_ABI,
  CLEAR_ADDRESS,
  SEAPORT_ADDRESS,
  SEAPORT_V1_5_ABI,
} from '@nickadamson/sdk';
import { defineConfig } from '@wagmi/cli';
import { erc20ABI } from 'wagmi';
import { react } from '@wagmi/cli/plugins';

export default defineConfig({
  out: 'src/lib/codegen/wagmi.ts',
  contracts: [
    {
      name: 'Clear',
      address: CLEAR_ADDRESS,
      abi: CLEAR_ABI,
    },
    {
      name: 'Seaport',
      address: SEAPORT_ADDRESS,
      abi: SEAPORT_V1_5_ABI,
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
