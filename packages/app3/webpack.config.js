const webpack = require("webpack");
const path = require("path");
const ServerSideModuleFederationPlugin = require("server-side-module-federation-plugin");

const remotes = {
  app2: "http://localhost:8080/app2.js",
};

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
    publicPath: "http://localhost:8081/",
  },
  entry: {},
  target: "node",
  plugins: [
    new ServerSideModuleFederationPlugin({
      name: "app3",
      library: { type: "commonjs-module" },
      exposes: {
        "./shared": "./src/shared",
      },
      remotes,
      shared: ["app2"],
    }),
  ],
  stats: {
    errorDetails: true,
  },
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
  entry: {},
  plugins: [
    new webpack.container.ModuleFederationPlugin({
      name: "app3",
      exposes: {
        "./shared": "./src/shared",
      },
      remotes,
      shared: ["app2"],
    }),
  ],
  output: {
    path: path.join(__dirname, "dist/client"),
  },
  stats: {
    errorDetails: true,
  },
};

module.exports = [clientConfig, serverConfig];
