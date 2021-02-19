import { renderToString } from "react-dom/server";
import React from "react";
import App from "../components/App";

export default () => {
  const html = renderToString(<App />);
  return { html };
};
