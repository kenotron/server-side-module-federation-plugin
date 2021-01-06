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
  entry: "./src/index.js",
  output: {
    path: path.join(__dirname, "dist/server"),
    libraryTarget: "commonjs-module",
    chunkLoading: "async-http-node",
  },
  target: "node",
  plugins: [
    new ServerSideModuleFederationPlugin({
      name: "app1",
      library: { type: "commonjs-module" },
      remotes: remotes("server"),
      shared: ["app2"],
    }),
  ],
  stats: { errorDetails: true },
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
  entry: "./src/index.js",
  output: {
    path: path.join(__dirname, "dist/client"),
  },
  target: "node",
  plugins: [
    new webpack.container.ModuleFederationPlugin({
      name: "app1",
      remotes: remotes("client"),
      shared: ["app2"],
    }),
  ],
  stats: { errorDetails: true },
};

module.exports = [clientConfig, serverConfig];
