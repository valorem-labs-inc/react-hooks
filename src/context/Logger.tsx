/* eslint-disable @typescript-eslint/no-explicit-any -- console uses any */
/* eslint-disable no-console -- custom console */

import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo } from 'react';

/**
 * Enum representing various logging levels.
 */
export enum LogLevel {
  'Debug',
  'Info',
  'Warn',
  'Error',
  'Silent',
}

/**
 * Logger class to encapsulate logging functionality.
 */
class Logger {
  constructor(public level: LogLevel) {}

  /**
   * Generic logging method.
   * @param message - Message to be logged.
   * @param optionalParams - Additional logging parameters.
   */
  log(message?: any, ...optionalParams: any[]) {
    this.#_log(LogLevel.Info, message, ...optionalParams);
  }

  /**
   * Logs a debug message.
   * @param message - Message to be logged.
   * @param optionalParams - Additional logging parameters.
   */
  debug(message?: any, ...optionalParams: any[]) {
    this.#_log(LogLevel.Debug, message, ...optionalParams);
  }

  /**
   * Logs an info message.
   * @param message - Message to be logged.
   * @param optionalParams - Additional logging parameters.
   */
  info(message?: any, ...optionalParams: any[]) {
    this.#_log(LogLevel.Info, message, ...optionalParams);
  }

  /**
   * Logs a warning message.
   * @param message - Message to be logged.
   * @param optionalParams - Additional logging parameters.
   */
  warn(message?: any, ...optionalParams: any[]) {
    this.#_log(LogLevel.Warn, message, ...optionalParams);
  }

  /**
   * Logs an error message.
   * @param message - Message to be logged.
   * @param optionalParams - Additional logging parameters.
   */
  error(message?: any, ...optionalParams: any[]) {
    this.#_log(LogLevel.Error, message, ...optionalParams);
  }

  /**
   * Private method to handle logging based on the log level.
   * @param level - The logging level.
   * @param message - Message to be logged.
   * @param optionalParams - Additional logging parameters.
   */
  #_log(level: LogLevel, message?: any, ...optionalParams: any[]) {
    if (level < this.level) {
      return;
    }
    switch (level) {
      case LogLevel.Debug:
        console.debug(message, ...optionalParams);
        return;
      case LogLevel.Info:
        console.info(message, ...optionalParams);
        return;
      case LogLevel.Warn:
        console.warn(message, ...optionalParams);
        return;
      case LogLevel.Error:
        console.error(message, ...optionalParams);
        break;
      default:
        break;
    }
  }
}

interface LoggerContext {
  logger: Logger;
}

const LoggerContext = createContext<LoggerContext | undefined>(undefined);

/**
 * Provides a logging context to its children.
 *
 * @param logLevel - Props with logLevel and children.
 * @param children - children to be wrapped by the LoggerProvider.
 * @returns A Logger context provider component.
 */
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

/**
 * Custom hook to use the logging context.
 *
 * @returns - The logger instance from the context.
 * @throws Error if used outside of LoggerProvider context.
 */
export function useLogger() {
  const context = useContext(LoggerContext);
  if (context === undefined) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }
  return context.logger;
}
