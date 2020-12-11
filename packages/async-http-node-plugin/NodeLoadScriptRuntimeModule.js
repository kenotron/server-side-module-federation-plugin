/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const Compilation = require("webpack/lib/Compilation");
const RuntimeGlobals = require("webpack/lib/RuntimeGlobals");
const Template = require("webpack/lib/Template");
const HelperRuntimeModule = require("webpack/lib/runtime/HelperRuntimeModule");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

/**
 * @typedef {Object} NodeLoadScriptCompilationHooks
 * @property {SyncWaterfallHook<[string, Chunk]>} createScript
 */

/** @type {WeakMap<Compilation, LoadScriptCompilationHooks>} */
const compilationHooksMap = new WeakMap();

class NodeLoadScriptRuntimeModule extends HelperRuntimeModule {
  /**
   * @param {Compilation} compilation the compilation
   * @returns {NodeLoadScriptCompilationHooks} hooks
   */
  static getCompilationHooks(compilation) {
    if (!(compilation instanceof Compilation)) {
      throw new TypeError(
        "The 'compilation' argument must be an instance of Compilation"
      );
    }
    let hooks = compilationHooksMap.get(compilation);
    if (hooks === undefined) {
      hooks = {
        createScript: new SyncWaterfallHook(["source", "chunk"]),
      };
      compilationHooksMap.set(compilation, hooks);
    }
    return hooks;
  }

  constructor() {
    super("node load script");
  }

  /**
   * @returns {string} runtime code
   */
  generate() {
    const { compilation } = this;
    const { runtimeTemplate, outputOptions } = compilation;
    const {
      chunkLoadTimeout: loadTimeout,
      crossOriginLoading,
      uniqueName,
      charset,
    } = outputOptions;
    const fn = RuntimeGlobals.loadScript;

    const { createScript } = NodeLoadScriptRuntimeModule.getCompilationHooks(
      compilation
    );

    const code = `${fn} = ${runtimeTemplate.basicFunction("url, done, key", [
      "require('http').get(url, 'utf-8', function(res) {",
      Template.indent([
        "let parsedUrl = require('url').parse(url);",
        "let filename = require('path').basename(parsedUrl.pathname);",
        "let statusCode = res.statusCode;",
        `res.setEncoding('utf8');`,
        `let content = '';`,
        `if (statusCode !== 200) {`,
        Template.indent([
          `return reject(new Error('Request Failed. Status Code: ' + statusCode));`,
        ]),
        `}`,
        `res.on('data', (c) => { content += c; });`,
        `res.on('end', () => {`,
        Template.indent([
          "var chunk = {};",
          "require('vm').runInThisContext('(function(exports, require, __dirname, __filename) {' + content + '})', filename)" +
            "(chunk, require, require('path').dirname(filename), filename);",
          "done();",
        ]),
        `});`,
      ]),
      "});",
    ])}`;

    return code;

    // const code = Template.asString([
    //   "script = document.createElement('script');",
    //   scriptType ? `script.type = ${JSON.stringify(scriptType)};` : "",
    //   charset ? "script.charset = 'utf-8';" : "",
    //   `script.timeout = ${loadTimeout / 1000};`,
    //   `if (${RuntimeGlobals.scriptNonce}) {`,
    //   Template.indent(
    //     `script.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
    //   ),
    //   "}",
    //   uniqueName
    //     ? 'script.setAttribute("data-webpack", dataWebpackPrefix + key);'
    //     : "",
    //   `script.src = url;`,
    //   crossOriginLoading
    //     ? Template.asString([
    //         "if (script.src.indexOf(window.location.origin + '/') !== 0) {",
    //         Template.indent(
    //           `script.crossOrigin = ${JSON.stringify(crossOriginLoading)};`
    //         ),
    //         "}",
    //       ])
    //     : "",
    // ]);

    // return Template.asString([
    //   "var inProgress = {};",
    //   uniqueName
    //     ? `var dataWebpackPrefix = ${JSON.stringify(uniqueName + ":")};`
    //     : "// data-webpack is not used as build has no uniqueName",
    //   "// loadScript function to load a script via script tag",
    //   `${fn} = ${runtimeTemplate.basicFunction("url, done, key", [
    //     "if(inProgress[url]) { inProgress[url].push(done); return; }",
    //     "var script, needAttach;",
    //     "if(key !== undefined) {",
    //     Template.indent([
    //       'var scripts = document.getElementsByTagName("script");',
    //       "for(var i = 0; i < scripts.length; i++) {",
    //       Template.indent([
    //         "var s = scripts[i];",
    //         `if(s.getAttribute("src") == url${
    //           uniqueName
    //             ? ' || s.getAttribute("data-webpack") == dataWebpackPrefix + key'
    //             : ""
    //         }) { script = s; break; }`,
    //       ]),
    //       "}",
    //     ]),
    //     "}",
    //     "if(!script) {",
    //     Template.indent([
    //       "needAttach = true;",
    //       createScript.call(code, this.chunk),
    //     ]),
    //     "}",
    //     "inProgress[url] = [done];",
    //     "var onScriptComplete = " +
    //       runtimeTemplate.basicFunction(
    //         "prev, event",
    //         Template.asString([
    //           "// avoid mem leaks in IE.",
    //           "script.onerror = script.onload = null;",
    //           "clearTimeout(timeout);",
    //           "var doneFns = inProgress[url];",
    //           "delete inProgress[url];",
    //           "script.parentNode && script.parentNode.removeChild(script);",
    //           `doneFns && doneFns.forEach(${runtimeTemplate.returningFunction(
    //             "fn(event)",
    //             "fn"
    //           )});`,
    //           "if(prev) return prev(event);",
    //         ])
    //       ),
    //     ";",
    //     `var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), ${loadTimeout});`,
    //     "script.onerror = onScriptComplete.bind(null, script.onerror);",
    //     "script.onload = onScriptComplete.bind(null, script.onload);",
    //     "needAttach && document.head.appendChild(script);",
    //   ])};`,
    // ]);
  }
}

module.exports = NodeLoadScriptRuntimeModule;
