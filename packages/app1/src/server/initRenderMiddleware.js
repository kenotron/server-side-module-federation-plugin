export default async function initRenderMiddleware(app) {
  const renderer = (await import("./renderer")).default;
  app.get("/*", (req, res, next) => renderer(req, res, next));
}
