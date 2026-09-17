import type { ErrorEvent } from "@sentry/cloudflare";

type Diagnostic = {
  event:
    | "request.failed"
    | "rpc.failed"
    | "battle.command_rejected"
    | "battle.ai_commit_failed"
    | "battle.recovered"
    | "battle.delivery_retry"
    | "battle.delivery_complete";
  battleId?: string;
  revision?: number;
  failures?: number;
  version?: string;
};

const safeIdentifier = (value: string | undefined) =>
  value && /^[a-zA-Z0-9_.-]{1,100}$/.test(value) ? value : undefined;

/** Diagnostic payloads are deliberately closed: never pass an error or command. */
export function diagnostic(value: Diagnostic) {
  console.info(
    JSON.stringify({
      event: value.event,
      battleId: safeIdentifier(value.battleId),
      revision: value.revision,
      failures: value.failures,
      version: safeIdentifier(value.version),
    }),
  );
}

/** Keep grouping and source locations; discard request, user and error payloads. */
export function redactTelemetry(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: event.level,
    platform: event.platform,
    release: safeIdentifier(event.release),
    environment: ["production", "staging", "development"].includes(
      event.environment ?? "",
    )
      ? event.environment
      : undefined,
    exception: event.exception && {
      values: event.exception.values?.map((exception) => ({
        type: "Error",
        value: "Application error; request details redacted",
        stacktrace: exception.stacktrace && {
          frames: exception.stacktrace.frames?.map((frame) => ({
            filename: frame.filename?.split(/[?#]/)[0]?.split("/").at(-1),
            function: frame.function,
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app,
          })),
        },
      })),
    },
  };
}
