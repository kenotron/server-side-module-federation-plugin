const axios = require("axios").default;
const vm = require("vm");
const mod = require("module");
const path = require("path");

async function requireFromUrlAsync(file) {
  console.log(`requiring ${file}`);

  file = file.replace(/^\.\//, "");

  const app2Res = await axios.get(`http://localhost:8080/${file}`);
  const src = app2Res.data.toString();

  var m = { exports: {} };

  vm.runInThisContext(mod.wrap(src))(
    m.exports,
    requireFromUrlAsync,
    m,
    path.basename(file),
    path.dirname(file)
  );

  return m.exports;
}

(async () => {
  const app2MF = await requireFromUrlAsync("app2.js");
  app2MF.init("default");

  const s = await app2MF.get("./shared", "default");
  console.log(s().default());
})();
