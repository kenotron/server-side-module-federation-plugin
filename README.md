# Server Side Module Federation Plugin

This plugin for Webpack will allow for servers to federation portions of the code. It is useful for server side rendering, in particular.

## Usage

1. Install the plugin

```
yarn add -D server-side-module-federation-plugin
```

2. Apply the plugin inside your webpack config for the SERVER, being sure to add some server side appropriate options

```js
const ServerSideModuleFederationPlugin = require('server-side-module-federation-plugin');
module.exports = {
  entry: {}
  output: {
    libraryTarget: "commonjs-module",
    chunkLoading: "async-http-node",
    publicPath: 'http://some.cdn1.com/server/this-package/'
  },
  target: 'node',
  plugins: [
    new ServerSideModuleFederationPlugin({
      name: "nameOfYourBundle",
      library: {
        type: 'commonjs-module'
      },
      exposes: {
        './exposed1': './src/exposed1'
      }
      remotes: {
        remote1: 'http://some.cdn.com/server/remote1/remote-entry.js',
        remote2: 'http://some.othercdn.com/server/remote2/remote-entry.js',
      }
    });
  ]
}
```

3. Make sure to have an equivalent webpack config for the CLIENT

```js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
module.exports = {
  entry: {}
  plugins: [
    new ModuleFederationPlugin({
      name: "nameOfYourBundle",
      exposes: {
        './exposed1': './src/exposed1'
      }
      remotes: {
        remote1: 'remote1@http://some.cdn.com/client/remote1/remote-entry.js',
        remote2: 'remote2@http://some.othercdn.com/client/remote2/remote-entry.js',
      }
    });
  ]
}
```

4. Now use the exposed modules from inside "nameOfYourBundle" code

```js
// App.js
import React, { lazy } from "react";
import Component1 from "remote1/Component1";
const Component2 = lazy(() => import("remote2/Component2"));

export default () => {
  return (
    <React.Suspense fallback="loading">
      <p>
        Alice: <Component1 /> is the best!
      </p>
      <p>
        Bob: no, <Component2 /> is the best!
      </p>
    </React>
  );
};
```

5. You can use `App.js` inside a client bootstrapped code OR server bootstrapped code!

## Trying out this repo

```
git clone https://github.com/kenotron/server-side-module-federation-plugin.git
cd server-side-module-federation-plugin
yarn
yarn start
```

In another terminal:
```
yarn workspace app1 test
```
