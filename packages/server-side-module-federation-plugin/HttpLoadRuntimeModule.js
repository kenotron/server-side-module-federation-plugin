"use strict";

const RuntimeGlobals = require("webpack/lib/RuntimeGlobals");
const RuntimeModule = require("webpack/lib/RuntimeModule");
const Template = require("webpack/lib/Template");
const path = require("path");

class HttpLoadRuntimeModule extends RuntimeModule {
  constructor(runtimeRequirements) {
    super("http external", 11);
    this.runtimeRequirements = runtimeRequirements;
  }

  /**
   * @returns {string} runtime code
   */
  generate() {
    const { runtimeTemplate } = this.compilation;

    const code =
      `${RuntimeGlobals.require}.httpExternal = ` +
      runtimeTemplate.basicFunction(
        ["url"],
        [
          `return new Promise(${runtimeTemplate.basicFunction("resolve, reject", [
            `var filename = require("path").basename(url);`,
            `var protocol = require("url").parse(url).protocol.replace(':', '');`,
            `if (!protocol.startsWith("http")) { return reject() }`,
            `require(protocol).get(url, "utf-8", function (res) {`,
            Template.indent([
              `var statusCode = res.statusCode;`,
              `res.setEncoding("utf8");`,
              `let content = "";`,
              `if (statusCode !== 200) {`,
              Template.indent([`return reject(new Error("Request Failed. Status Code: " + statusCode));`]),
              `}`,
              `res.on("data", (c) => {`,
              Template.indent([`content += c;`]),
              `});`,
              `res.on("end", () => {`,
              Template.indent([
                `if (statusCode === 200) {`,
                Template.indent([
                  `let chunk = { exports: {} };`,
                  `require("vm").runInThisContext("(function(exports, require, module, __filename, __dirname){"+content+"}\\n)", filename)(`,
                  Template.indent([`chunk.exports,require,chunk,require("path").dirname(filename),filename`]),
                  `);`,
                  `resolve(chunk.exports);`,
                ]),
                `}`,
              ]),
              `});`,
            ]),
            `});`,
          ])})`,
        ]
      );

    return Template.asString([code]);
  }
}

module.exports = HttpLoadRuntimeModule;
