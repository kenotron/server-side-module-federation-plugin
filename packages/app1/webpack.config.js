const webpack = require("webpack");
const NodeHttpChunkLoadingPlugin = require("../async-http-node-plugin/NodeHttpChunkLoadPlugin");

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
  target: "node",
  output: {
    libraryTarget: "commonjs-module",
    chunkLoading: "async-http-node",
  },
  plugins: [
    new NodeHttpChunkLoadingPlugin(),
    new webpack.container.ModuleFederationPlugin({
      name: "app1",
      library: {
        type: "commonjs-module",
      },
      remotes: {
        app2: {
          external: `promise new Promise(function (resolve, reject) {
            var filename = "app2.js";
            var url = "http://localhost:8080/" + filename.replace(/^.\\//, "");
            require("http").get(url, "utf-8", function (res) {
              var statusCode = res.statusCode;
              res.setEncoding("utf8");
              let content = "";
              if (statusCode !== 200) {
                return reject(new Error("Request Failed. Status Code: " + statusCode));
              }
              res.on("data", (c) => {
                content += c;
              });
              res.on("end", () => {
                if (statusCode === 200) {
                  let chunk = { exports: {} };
                  require("vm").runInThisContext("(function(exports, require, module, __filename, __dirname){"+content+"}\\n)", filename)(
                    chunk.exports,
                    require,
                    chunk,
                    require("path").dirname(filename),
                    filename
                  );
    
                  resolve(chunk.exports);
                }
              });
            });
          });
    `,
        },
      },
    }),
  ],
};
