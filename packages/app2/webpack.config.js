const webpack = require("webpack");
const NodeHttpChunkLoadingPlugin = require("./NodeHttpChunkLoadPlugin");
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
    chunkLoading: "async-http-node",
  },
  entry: {},
  target: "node",
  plugins: [
    new NodeHttpChunkLoadingPlugin(),
    new webpack.container.ModuleFederationPlugin({
      name: "app2",
      library: { type: "commonjs-module" },
      exposes: {
        "./shared": "./src/shared",
      },
    }),
  ],
};
