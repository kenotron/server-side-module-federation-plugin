"use strict";

const RuntimeGlobals = require("webpack/lib/RuntimeGlobals");
const RuntimeModule = require("webpack/lib/RuntimeModule");
const Template = require("webpack/lib/Template");
const { chunkHasJs, getChunkFilenameTemplate } = require("webpack/lib/javascript/JavascriptModulesPlugin");
const compileBooleanMatcher = require("webpack/lib/util/compileBooleanMatcher");
const { getUndoPath } = require("webpack/lib/util/identifier");

class HttpChunkLoadingRuntimeModule extends RuntimeModule {
  constructor(runtimeRequirements) {
    super("http chunk loading", 10);
    this.runtimeRequirements = runtimeRequirements;
  }

  /**
   * @returns {string} runtime code
   */
  generate() {
    const { chunk } = this;
    const { chunkGraph, runtimeTemplate } = this.compilation;
    const fn = RuntimeGlobals.ensureChunkHandlers;
    const withExternalInstallChunk = this.runtimeRequirements.has(RuntimeGlobals.externalInstallChunk);
    const withLoading = this.runtimeRequirements.has(RuntimeGlobals.ensureChunkHandlers);
    const hasJsMatcher = compileBooleanMatcher(chunkGraph.getChunkConditionMap(chunk, chunkHasJs));

    const outputName = this.compilation.getPath(getChunkFilenameTemplate(chunk, this.compilation.outputOptions), {
      chunk,
      contentHashType: "javascript",
    });
    const rootOutputDir = getUndoPath(outputName, false);

    return Template.asString([
      "// object to store loaded chunks",
      '// "0" means "already loaded", Promise means loading',
      "var installedChunks = {",
      Template.indent(chunk.ids.map((id) => `${JSON.stringify(id)}: 0`).join(",\n")),
      "};",
      "",
      withLoading || withExternalInstallChunk
        ? `var installChunk = ${runtimeTemplate.basicFunction("chunk", [
            "var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;",
            "for(var moduleId in moreModules) {",
            Template.indent([
              `if(${RuntimeGlobals.hasOwnProperty}(moreModules, moduleId)) {`,
              Template.indent([`${RuntimeGlobals.moduleFactories}[moduleId] = moreModules[moduleId];`]),
              "}",
            ]),
            "}",
            `if(runtime) runtime(__webpack_require__);`,
            "var callbacks = [];",
            "for(var i = 0; i < chunkIds.length; i++) {",
            Template.indent([
              "if(installedChunks[chunkIds[i]])",
              Template.indent(["callbacks = callbacks.concat(installedChunks[chunkIds[i]][0]);"]),
              "installedChunks[chunkIds[i]] = 0;",
            ]),
            "}",
            "for(i = 0; i < callbacks.length; i++)",
            Template.indent("callbacks[i]();"),
          ])};`
        : "// no chunk install function needed",
      "",
      // add the http vm otherwise
      withLoading
        ? Template.asString([
            "// http request + VM.run chunk loading for javascript",
            `${fn}.httpVm = function(chunkId, promises) {`,
            hasJsMatcher !== false
              ? Template.indent([
                  "",
                  "var installedChunkData = installedChunks[chunkId];",
                  'if(installedChunkData !== 0) { // 0 means "already installed".',
                  Template.indent([
                    '// array of [resolve, reject, promise] means "currently loading"',
                    "if(installedChunkData) {",
                    Template.indent(["promises.push(installedChunkData[2]);"]),
                    "} else {",
                    Template.indent([
                      hasJsMatcher === true ? "if(true) { // all chunks have JS" : `if(${hasJsMatcher("chunkId")}) {`,
                      Template.indent([
                        "// load the chunk and return promise to it",
                        "var promise = new Promise(function(resolve, reject) {",
                        Template.indent([
                          "installedChunkData = installedChunks[chunkId] = [resolve, reject];",
                          `var filename = require('path').join(__dirname, ${JSON.stringify(rootOutputDir)} + ${
                            RuntimeGlobals.getChunkScriptFilename
                          }(chunkId));`,
                          "require('fs').readFile(filename, 'utf-8', function(err, content) {",
                          Template.indent([
                            "if (err) {return reject(err)};",
                            "var chunk = {};",
                            "require('vm').runInThisContext('(function(exports, require, __dirname, __filename) {' + content + '\\n})', filename)" +
                              "(chunk, require, require('path').dirname(filename), require('path').basename(filename));",
                            "installChunk(chunk);",
                          ]),
                          "});",
                        ]),
                        "}).catch((e) => new Promise(function(resolve, reject) {",
                        Template.indent([
                          `if (!${RuntimeGlobals.publicPath}) { reject(e); }`,
                          "installedChunkData[0] = resolve;",
                          "installedChunkData[1] = reject;",
                          `var filename = ${JSON.stringify(rootOutputDir)} + ${RuntimeGlobals.getChunkScriptFilename}(chunkId);`,
                          `var url = ${RuntimeGlobals.publicPath} + filename.replace(/^\.\\//,"");`,
                          `var protocol = require("url").parse(url).protocol.replace(':', '');`,
                          `if (!protocol.startsWith("http")) { return reject() }`,
                          `require(protocol).get(url, "utf-8", function (res) {`,
                          Template.indent([
                            "var statusCode = res.statusCode;",
                            `res.setEncoding('utf8');`,
                            `let content = '';`,
                            `if (statusCode !== 200) {`,
                            Template.indent([`return reject(new Error('Request Failed. Status Code: ' + statusCode));`]),
                            `}`,
                            `res.on('data', (c) => { content += c; });`,
                            `res.on('end', () => {`,
                            Template.indent([
                              "var chunk = {};",
                              "require('vm').runInThisContext('(function(exports, require, __dirname, __filename) {' + content + '\\n})', filename)" +
                                "(chunk, require, require('path').dirname(filename), filename);",
                              "installChunk(chunk);",
                            ]),
                            `});`,
                          ]),
                          "});",
                        ]),
                        "}));",
                        "promises.push(installedChunkData[2] = promise);",
                      ]),
                      "} else installedChunks[chunkId] = 0;",
                    ]),
                    "}",
                  ]),
                  "}",
                ])
              : Template.indent(["installedChunks[chunkId] = 0;"]),
            "};",
          ])
        : "// no chunk loading",
      "",
      withExternalInstallChunk
        ? Template.asString(["module.exports = __webpack_require__;", `${RuntimeGlobals.externalInstallChunk} = installChunk;`])
        : "// no external install chunk",
      "",
    ]);
  }
}

module.exports = HttpChunkLoadingRuntimeModule;
