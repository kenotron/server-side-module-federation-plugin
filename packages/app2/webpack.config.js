const webpack = require("webpack");
const path = require("path");
const ServerSideModuleFederationPlugin = require("server-side-module-federation-plugin");

const serverConfig = {
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
    path: path.join(__dirname, "dist/server"),
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

const clientConfig = {
  optimization: { minimize: false },
  module: {
    rules: [
      {
        test: /\.jsx?/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [["@babel/preset-env"]],
          },
        },
      },
    ],
  },
  output: {
    path: path.join(__dirname, "dist/client"),
  },
  entry: {},
  target: "node",
  plugins: [
    new webpack.container.ModuleFederationPlugin({
      name: "app2",
      exposes: {
        "./shared": "./src/shared",
      },
    }),
  ],
};

module.exports = [clientConfig, serverConfig];
