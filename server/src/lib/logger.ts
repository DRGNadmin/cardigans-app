export function createLogger(env: string) {
  return {
    level: env === "production" ? "info" : "debug",
  };
}
