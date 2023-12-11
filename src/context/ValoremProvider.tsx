import type { PropsWithChildren } from 'react';
import type { SIWEProps } from './SIWEProvider';
import { SIWEProvider } from './SIWEProvider';
import type { GRPCProviderProps } from './GRPCProvider';
import { GRPCProvider } from './GRPCProvider';
import { LogLevel, LoggerProvider } from './Logger';

/**
 * Defines the properties for the ValoremProvider component.
 */
export interface ValoremProviderProps extends PropsWithChildren {
  grpcConfig?: GRPCProviderProps;
  siweConfig?: SIWEProps;
  logLevel?: LogLevel;
}

/**
 * Provides a context for the Valorem application including gRPC, SIWE,
 * and logging functionalities.
 *
 * @param props - Component properties.
 * @returns A React component providing context for Valorem functionalities.
 */
export function ValoremProvider({
  grpcConfig,
  siweConfig,
  logLevel,
  children,
}: ValoremProviderProps) {
  return (
    <LoggerProvider logLevel={logLevel ?? LogLevel.Warn}>
      <GRPCProvider {...grpcConfig}>
        <SIWEProvider {...siweConfig}>{children}</SIWEProvider>
      </GRPCProvider>
    </LoggerProvider>
  );
}
