const webpack = require("webpack");
const path = require("path");
const ServerSideModuleFederationPlugin = require("server-side-module-federation-plugin");

const remotes = (remoteType) => ({
  app2: `${remoteType === "client" ? "app2@" : ""}http://localhost:8080/${remoteType}/app2.js`,
  app3: `${remoteType === "client" ? "app3@" : ""}http://localhost:8081/${remoteType}/app3.js`,
});

const shared = { react: { singleton: true }, "react-dom": { singleton: true } };

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
              "@babel/preset-react",
            ],
          },
        },
      },
    ],
  },
  entry: "./src/server/serverEntry.js",
  output: {
    filename: "serverEntry.js",
    path: path.join(__dirname, "dist/server"),
    libraryTarget: "commonjs-module",
    chunkLoading: "async-http-node",
    publicPath: "http://localhost:3000/server/",
  },
  target: "node",
  plugins: [
    new ServerSideModuleFederationPlugin({
      name: "app1",
      library: { type: "commonjs-module" },
      remotes: remotes("server"),
      shared,
    }),
  ],
  stats: { errorDetails: true },
  devServer: {
    writeToDisk: true,
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
            presets: [["@babel/preset-env"], "@babel/preset-react"],
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
      shared,
    }),
  ],
  stats: { errorDetails: true },
};

module.exports = [clientConfig, serverConfig];
