const webpack = require("webpack");
const NodeHttpChunkLoadingPlugin = require("../async-http-node-plugin/NodeHttpChunkLoadPlugin");

const remotes = {
  app2: "http://localhost:8080/app2.js",
  app3: "http://localhost:8081/app3.js",
};

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
  entry: "./src/index.js",
  output: {
    libraryTarget: "commonjs-module",
    chunkLoading: "async-http-node",
  },
  target: "node",
  plugins: [
    new NodeHttpChunkLoadingPlugin({
      remotes,
    }),
    new webpack.container.ModuleFederationPlugin({
      name: "app1",
      library: { type: "commonjs-module" },
      remotes,
      shared: ["app2"],
    }),
  ],
  stats: { errorDetails: true },
};
