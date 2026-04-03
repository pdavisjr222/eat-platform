const isProduction = process.env.NODE_ENV === "production";

function formatMsg(level: string, data: Record<string, unknown> | string, msg?: string) {
  if (isProduction) {
    // JSON structured logging for production log aggregators
    const obj = typeof data === "string" ? { msg: data } : { ...data, msg: msg ?? "" };
    process.stdout.write(JSON.stringify({ level, time: Date.now(), ...obj }) + "\n");
  } else {
    const message = typeof data === "string" ? data : `${msg ?? ""} ${JSON.stringify(data)}`;
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}

export const logger = {
  info: (data: Record<string, unknown> | string, msg?: string) => formatMsg("info", data, msg),
  warn: (data: Record<string, unknown> | string, msg?: string) => formatMsg("warn", data, msg),
  error: (data: Record<string, unknown> | string, msg?: string) => formatMsg("error", data, msg),
  debug: (data: Record<string, unknown> | string, msg?: string) => formatMsg("debug", data, msg),
};

export default logger;
