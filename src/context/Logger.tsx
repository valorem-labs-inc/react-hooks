/* eslint-disable no-console -- custom console */
 
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo } from 'react';

type LogParams = Parameters<typeof console.log>;

export enum LogLevel {
  'Debug',
  'Info',
  'Warn',
  'Error',
  'Silent',
}

class Logger {
  constructor(public level: LogLevel) {}

  public log: (...args: LogParams) => void = (message, ...optionalParams) => {
    this.info(message, optionalParams);
  };

  public debug: (...args: LogParams) => void = (message, ...optionalParams) => {
    this.#_log(LogLevel.Debug, message, optionalParams);
  };

  public info: (...args: LogParams) => void = (message, ...optionalParams) => {
    this.#_log(LogLevel.Info, message, optionalParams);
  };

  public warn: (...args: LogParams) => void = (message, ...optionalParams) => {
    this.#_log(LogLevel.Warn, message, optionalParams);
  };

  public error: (...args: LogParams) => void = (message, ...optionalParams) => {
    this.#_log(LogLevel.Error, message, optionalParams);
  };

  //   #_log: (level: LogLevel, message: any, ...optionParams: any[]) => void = (
  #_log: (level: LogLevel, ...rest: LogParams) => void = (
    level: LogLevel,
    message,
    ...optionalParams
  ) => {
    if (level < this.level) {
      return;
    }
    switch (level) {
      case LogLevel.Debug:
        console.debug(message, optionalParams);
        return;
      case LogLevel.Info:
        console.info(message, optionalParams);
        return;
      case LogLevel.Warn:
        console.warn(message, optionalParams);
        return;
      case LogLevel.Error:
        console.error(message, optionalParams);
        break;
      default:
        break;
    }
  };
}

interface LoggerContext {
  logger: Logger;
}

const LoggerContext = createContext<LoggerContext | undefined>(undefined);

export function LoggerProvider({
  logLevel,
  children,
}: PropsWithChildren<{ logLevel: LogLevel }>) {
  const logger = useMemo(() => {
    return new Logger(logLevel);
  }, [logLevel]);

  return (
    <LoggerContext.Provider value={{ logger }}>
      {children}
    </LoggerContext.Provider>
  );
}

export function useLogger() {
  const context = useContext(LoggerContext);
  if (context === undefined) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }
  return context.logger;
}
