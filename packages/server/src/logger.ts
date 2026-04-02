import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  ...(isProduction
    ? {
        // JSON output in production for log aggregators
        formatters: {
          level: (label: string) => ({ level: label }),
        },
      }
    : {
        // Pretty output in development
        transport: {
          target: "pino/file",
          options: { destination: 1 }, // stdout
        },
      }),
});

export default logger;
