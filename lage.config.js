module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: [],
    start: ["build"],
  },
  npmClient: "yarn",
};
