export default async function initRenderMiddleware(app) {
  app.get("/*", async (req, res, next) => {
    // always refresh the renderer implementation
    const { html } = (await import("./renderer")).default();
    delete require.cache[require.resolve("./renderer")];
    res.send(html);
  });
}
