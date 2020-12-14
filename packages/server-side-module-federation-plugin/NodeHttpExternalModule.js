"use strict";

const { OriginalSource, RawSource } = require("webpack-sources");
const ConcatenationScope = require("webpack/lib/ConcatenationScope");
const Module = require("webpack/lib/Module");
const RuntimeGlobals = require("webpack/lib/RuntimeGlobals");
const StaticExportsDependency = require("webpack/lib/dependencies/StaticExportsDependency");
const makeSerializable = require("webpack/lib/util/makeSerializable");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("./Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("./Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./util/Hash")} Hash */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

/**
 * @typedef {Object} SourceData
 * @property {boolean=} iife
 * @property {string=} init
 * @property {string} expression
 */

/**
 * @param {string|string[]} urlAndGlobal the script request
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @returns {SourceData} the generated source
 */
const getSource = (url, runtimeTemplate) => {
  return `${RuntimeGlobals.require}.httpExternal("${url}")`;
};

const TYPES = new Set(["javascript"]);
const RUNTIME_REQUIREMENTS = new Set([RuntimeGlobals.module]);
const RUNTIME_REQUIREMENTS_FOR_SCRIPT = new Set([RuntimeGlobals.module, RuntimeGlobals.loadScript]);
const RUNTIME_REQUIREMENTS_CONCATENATED = new Set([]);

class NodeHttpExternalModule extends Module {
  constructor(request, type, userRequest) {
    super("javascript/dynamic", null);

    // Info from Factory
    /** @type {string | string[] | Record<string, string | string[]>} */
    this.request = request;
    /** @type {string} */
    this.externalType = type;
    /** @type {string} */
    this.userRequest = userRequest;
  }

  /**
   * @returns {Set<string>} types available (do not mutate)
   */
  getSourceTypes() {
    return TYPES;
  }

  /**
   * @param {LibIdentOptions} options options
   * @returns {string | null} an identifier for library inclusion
   */
  libIdent(options) {
    return this.userRequest;
  }

  /**
   * @param {Chunk} chunk the chunk which condition should be checked
   * @param {Compilation} compilation the compilation
   * @returns {boolean} true, if the chunk is ok for the module
   */
  chunkCondition(chunk, { chunkGraph }) {
    return chunkGraph.getNumberOfEntryModules(chunk) > 0;
  }

  /**
   * @returns {string} a unique identifier of the module
   */
  identifier() {
    return "external " + JSON.stringify(this.request);
  }

  /**
   * @param {RequestShortener} requestShortener the request shortener
   * @returns {string} a user readable identifier of the module
   */
  readableIdentifier(requestShortener) {
    return "external " + JSON.stringify(this.request);
  }

  /**
   * @param {NeedBuildContext} context context info
   * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
   * @returns {void}
   */
  needBuild(context, callback) {
    return callback(null, !this.buildMeta);
  }

  /**
   * @param {WebpackOptions} options webpack options
   * @param {Compilation} compilation the compilation
   * @param {ResolverWithOptions} resolver the resolver
   * @param {InputFileSystem} fs the file system
   * @param {function(WebpackError=): void} callback callback function
   * @returns {void}
   */
  build(options, compilation, resolver, fs, callback) {
    this.buildMeta = {
      async: false,
      exportsType: undefined,
    };
    this.buildInfo = {
      strict: this.externalType !== "this",
    };
    this.buildMeta.exportsType = "dynamic";
    let canMangle = false;
    this.clearDependenciesAndBlocks();
    this.buildMeta.async = true;
    this.addDependency(new StaticExportsDependency(true, canMangle));

    callback();
  }

  /**
   * @param {ConcatenationBailoutReasonContext} context context
   * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
   */
  getConcatenationBailoutReason({ moduleGraph }) {
    switch (this.externalType) {
      case "amd":
      case "amd-require":
      case "umd":
      case "umd2":
      case "system":
      case "jsonp":
        return `${this.externalType} externals can't be concatenated`;
    }
    return undefined;
  }

  getSourceData(runtimeTemplate, moduleGraph, chunkGraph) {
    return {
      expression: getSource(this.request, runtimeTemplate),
    };
  }

  /**
   * @param {CodeGenerationContext} context context for code generation
   * @returns {CodeGenerationResult} result
   */
  codeGeneration({ runtimeTemplate, moduleGraph, chunkGraph, concatenationScope }) {
    const sourceData = this.getSourceData(runtimeTemplate, moduleGraph, chunkGraph);

    let sourceString = sourceData.expression;
    if (sourceData.iife) sourceString = `(function() { return ${sourceString}; }())`;
    if (concatenationScope) {
      sourceString = `${runtimeTemplate.supportsConst() ? "const" : "var"} ${
        ConcatenationScope.NAMESPACE_OBJECT_EXPORT
      } = ${sourceString};`;
      concatenationScope.registerNamespaceExport(ConcatenationScope.NAMESPACE_OBJECT_EXPORT);
    } else {
      sourceString = `module.exports = ${sourceString};`;
    }
    if (sourceData.init) sourceString = `${sourceData.init}\n${sourceString}`;

    const sources = new Map();
    if (this.useSourceMap || this.useSimpleSourceMap) {
      sources.set("javascript", new OriginalSource(sourceString, this.identifier()));
    } else {
      sources.set("javascript", new RawSource(sourceString));
    }

    return {
      sources,
      runtimeRequirements: concatenationScope
        ? RUNTIME_REQUIREMENTS_CONCATENATED
        : this.externalType === "script"
        ? RUNTIME_REQUIREMENTS_FOR_SCRIPT
        : RUNTIME_REQUIREMENTS,
    };
  }

  /**
   * @param {string=} type the source type for which the size should be estimated
   * @returns {number} the estimated size of the module (must be non-zero)
   */
  size(type) {
    return 42;
  }

  /**
   * @param {Hash} hash the hash used to track dependencies
   * @param {UpdateHashContext} context context
   * @returns {void}
   */
  updateHash(hash, context) {
    const { chunkGraph } = context;
    hash.update(this.externalType);
    hash.update(JSON.stringify(this.request));
    hash.update(JSON.stringify(Boolean(this.isOptional(chunkGraph.moduleGraph))));
    super.updateHash(hash, context);
  }

  serialize(context) {
    const { write } = context;

    write(this.request);
    write(this.externalType);
    write(this.userRequest);

    super.serialize(context);
  }

  deserialize(context) {
    const { read } = context;

    this.request = read();
    this.externalType = read();
    this.userRequest = read();

    super.deserialize(context);
  }
}

makeSerializable(NodeHttpExternalModule, "webpack/lib/NodeHttpExternalModule");

module.exports = NodeHttpExternalModule;
