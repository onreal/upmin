import type { MergeFailureCode } from "./merge";
import { adminText } from "../../app/translations";

const mergeFailureReason = (code: MergeFailureCode) => {
  if (code === "invalid_json") {
    return adminText("chat.mergeReason.invalidJson", "The response did not contain valid JSON.");
  }
  if (code === "no_target") {
    return adminText("chat.mergeReason.noTarget", "No JSON subtree matched the existing page data schema.");
  }
  return adminText("chat.mergeReason.schemaMismatch", "The response JSON did not match the existing page data schema.");
};

export const mergeFailureStatus = (code: MergeFailureCode) =>
  adminText("chat.mergeValidationFailed", "JSON validation failed: {reason}", {
    reason: mergeFailureReason(code),
  });

export const mergeFailureFeedback = (code: MergeFailureCode) =>
  adminText(
    "chat.mergeValidationFeedback",
    "JSON validation failed against the existing page data schema. Fix the response and return valid JSON only. Reason: {reason}",
    { reason: mergeFailureReason(code) }
  );

export const mergeSuccessStatus = (path: string) =>
  adminText("chat.mergeApplied", "Merged response into {path}.", { path });
