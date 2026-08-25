import { UnableToProcessEntryError } from "../shared/base/errors/UnableToProcessEntryError.js";

export class GuardianRequiredForMinorError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "student.guardian_required_for_minor",
      message: "A guardian is required when the student is a minor.",
      ...params,
    });
  }
}
