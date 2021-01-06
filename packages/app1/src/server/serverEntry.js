export default async (app) => {
  (await import("./initRenderMiddleware")).default(app);
};
