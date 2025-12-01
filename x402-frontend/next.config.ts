import path from "path";

// Using looser typing to allow experimental Turbopack fields until types catch up
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextConfig: any = {
  env: {
    PINO_NO_THREAD: "1",
  },
  // Transpile ESM packages that ship untranspiled code
  transpilePackages: [
    "@walletconnect/universal-provider",
    "@walletconnect/ethereum-provider",
    "@wagmi/core",
    "@wagmi/connectors",
    "@rainbow-me/rainbowkit",
  ],

  // Externalize server-only packages to prevent bundling
  serverComponentsExternalPackages: [
    "pino",
    "pino-pretty",
    "thread-stream",
    "sonic-boom",
    "pino-abstract-transport",
  ],

  // Turbopack configuration (required when webpack config is present in Next.js 16)
  turbopack: {
    root: __dirname,
  },
 
  // Webpack configuration (works for both dev and build)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any, { isServer }: any) => {
    // Only apply these fixes for client-side bundles
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // Replace pino with browser stub
        pino: path.resolve(__dirname, "lib/pino-browser.ts"),
        "pino/pino": path.resolve(__dirname, "lib/pino-browser.ts"),
        "pino/lib/transport": path.resolve(__dirname, "lib/pino-browser.ts"),
      } as typeof config.resolve.alias;

      // Completely ignore server-only and test dependencies
      config.plugins = config.plugins || [];
      // eslint-disable-next-line import/no-commonjs, @typescript-eslint/no-require-imports
      const webpack = require("webpack");

      config.plugins.push(
        // Ignore entire packages
        new webpack.IgnorePlugin({
          resourceRegExp: /^(thread-stream|sonic-boom|pino-pretty|pino-abstract-transport)$/,
        }),
        // Ignore pino's transport module
        new webpack.IgnorePlugin({
          resourceRegExp: /^pino$/,
          contextRegExp: /lib\/transport/,
        }),
        // Replace any remaining pino imports with browser stub
        new webpack.NormalModuleReplacementPlugin(
          /^pino$/,
          path.resolve(__dirname, "lib/pino-browser.ts")
        ),
        new webpack.NormalModuleReplacementPlugin(
          /pino\/lib\/transport/,
          path.resolve(__dirname, "lib/pino-browser.ts")
        )
      );

      // Fallback for any modules that can't be resolved
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        "thread-stream": false,
        "sonic-boom": false,
        "pino-pretty": false,
        "pino-abstract-transport": false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    return config;
  },
};

export default nextConfig;
