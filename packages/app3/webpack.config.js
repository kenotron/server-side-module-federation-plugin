const webpack = require("webpack");
const NodeHttpChunkLoadingPlugin = require("async-http-node-plugin");
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
    new NodeHttpChunkLoadingPlugin(),
    new webpack.container.ModuleFederationPlugin({
      name: "app3",
      library: { type: "commonjs-module" },
      exposes: {
        "./shared": "./src/shared",
      },
    }),
  ],
};
