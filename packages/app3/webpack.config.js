const webpack = require("webpack");
const path = require("path");
const ServerSideModuleFederationPlugin = require("server-side-module-federation-plugin");

const remotes = (remoteType) => ({
  app2: `${remoteType === "client" ? "app2@" : ""}http://localhost:8080/${remoteType}/app2.js`,
  app3: `${remoteType === "client" ? "app3@" : ""}http://localhost:8081/${remoteType}/app3.js`,
});

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
    publicPath: "http://localhost:8081/server",
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
      remotes: remotes("server"),
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
      remotes: remotes("client"),
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
