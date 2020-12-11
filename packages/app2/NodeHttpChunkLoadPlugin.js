/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const webpack = require("webpack");
const RuntimeGlobals = require("webpack/lib/RuntimeGlobals");
const StartupChunkDependenciesPlugin = require("webpack/lib/runtime/StartupChunkDependenciesPlugin");
const HttpChunkLoadingRuntimeModule = require("./HttpChunkLoadingRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

class NodeHttpChunkLoadingPlugin {
  constructor(options) {
    options = options || {};
    this._asyncChunkLoading = options.asyncChunkLoading;
  }

  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler) {
    webpack.javascript.EnableChunkLoadingPlugin.setEnabled(
      compiler,
      "async-http-node"
    );

    const chunkLoadingValue = "async-http-node";
    new StartupChunkDependenciesPlugin({
      chunkLoading: chunkLoadingValue,
      asyncChunkLoading: this._asyncChunkLoading,
    }).apply(compiler);
    compiler.hooks.thisCompilation.tap(
      "NodeHttpChunkLoadingPlugin",
      (compilation) => {
        const globalChunkLoading = compilation.outputOptions.chunkLoading;
        const isEnabledForChunk = (chunk) => {
          const options = chunk.getEntryOptions();
          const chunkLoading =
            (options && options.chunkLoading) || globalChunkLoading;
          return chunkLoading === chunkLoadingValue;
        };
        const onceForChunkSet = new WeakSet();
        const handler = (chunk, set) => {
          if (onceForChunkSet.has(chunk)) return;
          onceForChunkSet.add(chunk);
          if (!isEnabledForChunk(chunk)) return;
          set.add(RuntimeGlobals.moduleFactoriesAddOnly);
          set.add(RuntimeGlobals.hasOwnProperty);

          const m = new HttpChunkLoadingRuntimeModule(set);

          compilation.addRuntimeModule(chunk, m);
        };

        compilation.hooks.additionalTreeRuntimeRequirements.tap(
          "NodeHttpChunkLoadingPlugin",
          (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            if (
              Array.from(chunk.getAllReferencedChunks()).some(
                (c) =>
                  c !== chunk &&
                  compilation.chunkGraph.getNumberOfEntryModules(c) > 0
              )
            ) {
              set.add(RuntimeGlobals.startupEntrypoint);
              set.add(RuntimeGlobals.externalInstallChunk);
            }
          }
        );
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.ensureChunkHandlers)
          .tap("NodeHttpChunkLoadingPlugin", handler);
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.hmrDownloadUpdateHandlers)
          .tap("NodeHttpChunkLoadingPlugin", handler);
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.hmrDownloadManifest)
          .tap("NodeHttpChunkLoadingPlugin", handler);
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.baseURI)
          .tap("NodeHttpChunkLoadingPlugin", handler);

        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.ensureChunkHandlers)
          .tap("NodeHttpChunkLoadingPlugin", (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            set.add(RuntimeGlobals.getChunkScriptFilename);
          });
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.hmrDownloadUpdateHandlers)
          .tap("NodeHttpChunkLoadingPlugin", (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            set.add(RuntimeGlobals.getChunkUpdateScriptFilename);
            set.add(RuntimeGlobals.moduleCache);
            set.add(RuntimeGlobals.hmrModuleData);
            set.add(RuntimeGlobals.moduleFactoriesAddOnly);
          });
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.hmrDownloadManifest)
          .tap("NodeHttpChunkLoadingPlugin", (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            set.add(RuntimeGlobals.getUpdateManifestFilename);
          });
      }
    );
  }
}

module.exports = NodeHttpChunkLoadingPlugin;
