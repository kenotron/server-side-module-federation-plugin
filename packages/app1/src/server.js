const express = require("express");
const React = require("react");
const ReactDOM = require("react-dom/server");

const app = express();

app.get("*", (req, res) => {
  res.send(ReactDOM.renderToString(React.createElement("div", null, "hello")));
});

app.listen(3000);
