const webpack = require("webpack");
const ServerSideModuleFederationPlugin = require("server-side-module-federation-plugin");
module.exports = {
  optimization: { minimize: false },
  module: {
    rules: [
      {
        test: /\.jsx?/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    node: true,
                  },
                },
              ],
            ],
          },
        },
      },
    ],
  },
  output: {
    libraryTarget: "commonjs-module",
    chunkLoading: "async-http-node",
    publicPath: "http://localhost:8080/",
  },
  entry: {},
  target: "node",
  plugins: [
    new ServerSideModuleFederationPlugin({
      name: "app2",
      library: { type: "commonjs-module" },
      exposes: {
        "./shared": "./src/shared",
      },
    }),
  ],
};
