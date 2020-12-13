const webpack = require("webpack");
const NodeHttpChunkLoadingPlugin = require("async-http-node-plugin");

const remotes = {
  app2: "http://localhost:8080/app2.js",
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
  output: {
    libraryTarget: "commonjs-module",
    chunkLoading: "async-http-node",
    publicPath: "http://localhost:8081/",
  },
  entry: {},
  target: "node",
  plugins: [
    new NodeHttpChunkLoadingPlugin({ remotes }),
    new webpack.container.ModuleFederationPlugin({
      name: "app3",
      library: { type: "commonjs-module" },
      exposes: {
        "./shared": "./src/shared",
      },
      remotes,
      shared: ["app2"],
    }),
  ],
};
