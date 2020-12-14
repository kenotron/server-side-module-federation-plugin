"use strict";

const webpack = require("webpack");
const RuntimeGlobals = require("webpack/lib/RuntimeGlobals");
const StartupChunkDependenciesPlugin = require("webpack/lib/runtime/StartupChunkDependenciesPlugin");
const HttpChunkLoadingRuntimeModule = require("./HttpChunkLoadingRuntimeModule");
const HttpLoadRuntimeModule = require("./HttpLoadRuntimeModule");
const NodeHttpExternalModule = require("./NodeHttpExternalModule");

const { parseOptions } = require("webpack/lib/container/options");

/** @typedef {import("webpack/lib/Compiler")} Compiler */

class ServerSideModuleFederationPlugin {
  constructor(options) {
    options = options || {};
    this._asyncChunkLoading = options.asyncChunkLoading;
    this._remotes = parseOptions(
      options.remotes,
      (item) => ({
        external: Array.isArray(item) ? item : [item],
        shareScope: options.shareScope || "default",
      }),
      (item) => ({
        external: Array.isArray(item.external) ? item.external : [item.external],
        shareScope: item.shareScope || options.shareScope || "default",
      })
    );
    this._options = options;
  }

  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler) {
    const { _remotes: remotes, _remoteType: remoteType } = this;

    /** @type {Record<string, string>} */
    const remoteExternals = {};
    for (const [key, config] of remotes) {
      let i = 0;
      for (const external of config.external) {
        if (external.startsWith("internal ")) continue;
        remoteExternals[`webpack/container/reference/${key}${i ? `/fallback-${i}` : ""}`] = external;
        i++;
      }
    }

    new webpack.container.ModuleFederationPlugin(this._options).apply(compiler);

    compiler.hooks.compile.tap("NodeHttpChunkLoadingPlugin", ({ normalModuleFactory }) => {
      normalModuleFactory.hooks.factorize.tapAsync("NodeHttpChunkLoadingPlugin", (data, callback) => {
        const dependency = data.dependencies[0];
        if (Object.prototype.hasOwnProperty.call(remoteExternals, dependency.request)) {
          callback(null, new NodeHttpExternalModule(remoteExternals[dependency.request], "promise", dependency.request));
        } else {
          callback();
        }
      });
    });

    webpack.javascript.EnableChunkLoadingPlugin.setEnabled(compiler, "async-http-node");

    const chunkLoadingValue = "async-http-node";
    new StartupChunkDependenciesPlugin({
      chunkLoading: chunkLoadingValue,
      asyncChunkLoading: this._asyncChunkLoading,
    }).apply(compiler);

    compiler.hooks.thisCompilation.tap("NodeHttpChunkLoadingPlugin", (compilation) => {
      const globalChunkLoading = compilation.outputOptions.chunkLoading;
      const isEnabledForChunk = (chunk) => {
        const options = chunk.getEntryOptions();
        const chunkLoading = (options && options.chunkLoading) || globalChunkLoading;
        return chunkLoading === chunkLoadingValue;
      };
      const onceForChunkSet = new WeakSet();
      const handler = (chunk, set) => {
        if (onceForChunkSet.has(chunk)) return;
        onceForChunkSet.add(chunk);
        if (!isEnabledForChunk(chunk)) return;
        set.add(RuntimeGlobals.moduleFactoriesAddOnly);
        set.add(RuntimeGlobals.hasOwnProperty);
        set.add(RuntimeGlobals.publicPath);

        const m = new HttpChunkLoadingRuntimeModule(set);

        compilation.addRuntimeModule(chunk, m);
      };

      compilation.hooks.additionalTreeRuntimeRequirements.tap("NodeHttpChunkLoadingPlugin", (chunk, set) => {
        if (!isEnabledForChunk(chunk)) return;
        if (Array.from(chunk.getAllReferencedChunks()).some((c) => c !== chunk && compilation.chunkGraph.getNumberOfEntryModules(c) > 0)) {
          set.add(RuntimeGlobals.startupEntrypoint);
          set.add(RuntimeGlobals.externalInstallChunk);
        }
      });

      compilation.hooks.additionalTreeRuntimeRequirements.tap("NodeHttpChunkLoadingPlugin", (chunk, set) => {
        const m = new HttpLoadRuntimeModule(set);
        compilation.addRuntimeModule(chunk, m);
      });

      compilation.hooks.runtimeRequirementInTree.for(RuntimeGlobals.loadScript).tap("NodeHttpChunkLoadingPlugin", (chunk, set) => {
        const m = new HttpLoadScriptRuntimeModule(set);
        compilation.addRuntimeModule(chunk, m);
      });
      compilation.hooks.runtimeRequirementInTree.for(RuntimeGlobals.ensureChunkHandlers).tap("NodeHttpChunkLoadingPlugin", handler);
      compilation.hooks.runtimeRequirementInTree.for(RuntimeGlobals.baseURI).tap("NodeHttpChunkLoadingPlugin", handler);
      compilation.hooks.runtimeRequirementInTree.for(RuntimeGlobals.ensureChunkHandlers).tap("NodeHttpChunkLoadingPlugin", (chunk, set) => {
        if (!isEnabledForChunk(chunk)) return;
        set.add(RuntimeGlobals.getChunkScriptFilename);
      });
    });
  }
}

module.exports = ServerSideModuleFederationPlugin;
