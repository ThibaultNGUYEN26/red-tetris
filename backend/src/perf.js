export const isPerfLogEnabled = () => process.env.PERF_LOG === "1";

export const perfStart = () => Number(process.hrtime.bigint());

export const perfLogDuration = (label, start, details = {}) => {
  if (!isPerfLogEnabled()) return;
  const durationMs = Math.round((Number(process.hrtime.bigint()) - start) / 1e6);
  console.info(`[perf] ${label}`, {
    ...details,
    durationMs,
  });
};
