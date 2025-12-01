// Lightweight browser-friendly stub for pino to avoid server-only deps
// Provides the minimal API used by WalletConnect/Wagmi stacks

const bind = (fn: (...args: unknown[]) => void) => fn.bind(console);

const logger = {
  info: bind(console.info ?? console.log),
  error: bind(console.error ?? console.log),
  warn: bind(console.warn ?? console.log),
  debug: bind(console.debug ?? console.log),
  trace: bind(console.debug ?? console.log),
  fatal: bind(console.error ?? console.log),
  level: "info",
  child: () => logger,
};

export default function pino() {
  return logger;
}

export { logger };
