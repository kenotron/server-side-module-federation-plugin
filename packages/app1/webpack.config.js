const webpack = require('webpack')

module.exports = {
  optimization: { minimize: false },
  module: {
    rules: [
      {
        test: /\.jsx?/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    node: true
                  }
                }
              ]
            ]
          }
        }
      }
    ]
  },
  entry: './src/index.js',
  target: 'node',
  plugins: [
    new webpack.container.ModuleFederationPlugin({
      name: 'app1',
      remotes: {
        app2: 'app2@http://localhost:3001/app2.js'
      }
    })
  ]
}
