import { MAX_NOTE_LENGTH, MIN_NOTE_LENGTH } from "@/config/contract";
import type { ValidationResult } from "@/types";

export const validateNote = (note: string): ValidationResult => {
  const length = note.trim().length;

  if (length === 0) {
    return { valid: false, error: "Note is required" };
  }

  if (length < MIN_NOTE_LENGTH) {
    return {
      valid: false,
      error: `Note must be at least ${MIN_NOTE_LENGTH} characters (currently ${length})`,
    };
  }

  if (length > MAX_NOTE_LENGTH) {
    return {
      valid: false,
      error: `Note must be less than ${MAX_NOTE_LENGTH} characters (currently ${length})`,
    };
  }

  return { valid: true };
};

export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};
