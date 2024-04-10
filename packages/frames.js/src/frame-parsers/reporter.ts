import type {
  ParsingIssue,
  ParsingIssueLevel,
  ParsingIssueSource,
  Reporter,
} from "./types";

export function createReporter(source: ParsingIssueSource): Reporter {
  const reports: Record<string, ParsingIssue[]> = {};

  function report(
    key: string,
    message: unknown,
    level: ParsingIssueLevel,
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
      return Object.keys(reports).length > 0;
    },
    toObject() {
      return reports;
    },
  };
}
