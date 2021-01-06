import { renderToString } from "react-dom/server";
import React from "react";
import App from "../components/App";

export default (req, res, next) => {
  const html = renderToString(<App />);
  res.send(html);
};
