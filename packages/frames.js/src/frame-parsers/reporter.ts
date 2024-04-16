import type {
  ParsingReport,
  ParsingReportLevel,
  ParsingReportSource,
  Reporter,
} from "./types";

export function createReporter(source: ParsingReportSource): Reporter {
  const reports: Record<string, ParsingReport[]> = {};
  let errorCount = 0;
  let warningCount = 0;

  function report(
    key: string,
    message: unknown,
    level: ParsingReportLevel,
    issueSource = source
  ): void {
    const issuesList = reports[key] || [];
    let messageString = String(message);

    if (message instanceof Error) {
      messageString = message.message;
    } else if (
      typeof message === "object" &&
      message &&
      "message" in message &&
      typeof message.message === "string"
    ) {
      messageString = message.message;
    }

    issuesList.push({
      message: messageString,
      source: issueSource,
      level,
    });

    if (level === "error") {
      errorCount += 1;
    } else {
      warningCount += 1;
    }

    reports[key] = issuesList;
  }

  return {
    error(key, message, overrideSource) {
      report(key, message, "error", overrideSource);
    },
    warn(key, message, overrideSource) {
      report(key, message, "warning", overrideSource);
    },
    hasReports() {
      return warningCount + errorCount > 0;
    },
    hasErrors() {
      return errorCount > 0;
    },
    toObject() {
      return reports;
    },
  };
}
