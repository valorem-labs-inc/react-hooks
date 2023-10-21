import type { PropsWithChildren } from 'react';
import type { SIWEProps } from './SIWEProvider';
import { SIWEProvider } from './SIWEProvider';
import type { GRPCProviderProps } from './GRPCProvider';
import { GRPCProvider } from './GRPCProvider';
import { LogLevel, LoggerProvider } from './Logger';

export interface ValoremProviderProps extends PropsWithChildren {
  grpcConfig?: GRPCProviderProps;
  siweConfig?: SIWEProps;
  logLevel?: LogLevel;
}

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
