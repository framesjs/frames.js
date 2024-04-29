import { ActionMetadata } from "frames.js";
import { Reporter, validate } from "frames.js/frame-parsers";
import { ParseActionResult } from "./types";

export function parseFarcasterAction(
  raw: Partial<ActionMetadata>,
  reporter: Reporter
): ParseActionResult {
  const actionMetadata = { ...raw };

  if (actionMetadata.name) {
    actionMetadata.name = validate(
      reporter,
      "name",
      (name: string) => {
        if (name.length > 30) {
          throw new Error("Name must be less than 30 characters");
        }
        return name;
      },
      actionMetadata.name
    );
  } else {
    reporter.error("name", "Name is required");
  }

  if (actionMetadata.icon) {
    actionMetadata.icon = validate(
      reporter,
      "icon",
      (icon: string) => {
        if (!icon) {
          throw new Error("Icon is required");
        }
        return icon;
      },
      actionMetadata.icon
    );
  } else {
    reporter.error("icon", "Icon is required");
  }

  if (actionMetadata.description) {
    actionMetadata.description = validate(
      reporter,
      "description",
      (description: string) => {
        if (description.length > 80) {
          throw new Error("Description must be less than 80 characters");
        }
        return description;
      },
      actionMetadata.description
    );
  } else {
    reporter.error("description", "Description is required");
  }

  if (actionMetadata.aboutUrl) {
    actionMetadata.aboutUrl = validate(
      reporter,
      "aboutUrl",
      (url: string) => {
        if (!url) {
          throw new Error("About URL is required");
        }
        return url;
      },
      actionMetadata.aboutUrl
    );
  } else {
    reporter.error("aboutUrl", "About URL is required");
  }

  if (actionMetadata.action) {
    if (actionMetadata.action.type !== "post") {
      reporter.error(
        "action",
        `Invalid action type "${actionMetadata.action.type}"`
      );
    }
  } else {
    reporter.error("action", "Action is required");
  }

  if (reporter.hasErrors()) {
    return {
      status: "failure",
      action: actionMetadata,
      reports: reporter.toObject(),
    };
  }

  return {
    status: "success",
    action: actionMetadata as ActionMetadata,
    reports: reporter.toObject(),
  };
}
