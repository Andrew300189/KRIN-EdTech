export const INTERFACE_LANGUAGES = ["en", "uk", "ru", "de", "es", "fr"] as const;

export type InterfaceLanguage = (typeof INTERFACE_LANGUAGES)[number];

export type UserProfilePatch = {
  firstName?: string;
  lastName?: string | null;
  interfaceLanguage?: InterfaceLanguage;
  timeZone?: string;
  country?: string | null;
  avatar?: string | null;
};

type ValidationResult =
  | { success: true; data: UserProfilePatch }
  | { success: false; error: string };

const MAX_AVATAR_LENGTH = 2_800_000;
const DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;

function asTrimmedString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : null;
}

function isValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function displayName(firstName: string, lastName: string | null) {
  return `${firstName} ${lastName ?? ""}`.trim();
}

export function profileNameParts(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "Learner",
    lastName: parts.slice(1).join(" ") || null,
  };
}

export function validateUserProfilePatch(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { success: false, error: "Invalid profile data." };
  }

  const body = input as Record<string, unknown>;
  if ("email" in body) {
    return { success: false, error: "Email cannot be changed." };
  }

  const data: UserProfilePatch = {};

  if ("firstName" in body) {
    const firstName = asTrimmedString(body.firstName, 80);
    if (!firstName) {
      return { success: false, error: "First name must contain up to 80 characters." };
    }
    data.firstName = firstName;
  }

  if ("lastName" in body) {
    if (body.lastName === null || body.lastName === "") {
      data.lastName = null;
    } else {
      const lastName = asTrimmedString(body.lastName, 80);
      if (!lastName) {
        return { success: false, error: "Last name must contain up to 80 characters." };
      }
      data.lastName = lastName;
    }
  }

  if ("interfaceLanguage" in body) {
    const language = asTrimmedString(body.interfaceLanguage, 10);
    if (!language || !INTERFACE_LANGUAGES.includes(language as InterfaceLanguage)) {
      return { success: false, error: "Choose a supported interface language." };
    }
    data.interfaceLanguage = language as InterfaceLanguage;
  }

  if ("timeZone" in body) {
    const timeZone = asTrimmedString(body.timeZone, 100);
    if (!timeZone || !isValidTimeZone(timeZone)) {
      return { success: false, error: "Choose a valid time zone." };
    }
    data.timeZone = timeZone;
  }

  if ("country" in body) {
    if (body.country === null || body.country === "") {
      data.country = null;
    } else {
      const country = asTrimmedString(body.country, 100);
      if (!country) {
        return { success: false, error: "Country must contain up to 100 characters." };
      }
      data.country = country;
    }
  }

  if ("avatar" in body) {
    if (body.avatar === null || body.avatar === "") {
      data.avatar = null;
    } else {
      const avatar = asTrimmedString(body.avatar, MAX_AVATAR_LENGTH);
      if (
        !avatar ||
        (!avatar.startsWith("https://") && !DATA_IMAGE_PATTERN.test(avatar))
      ) {
        return {
          success: false,
          error: "Photo must be an HTTPS image URL or a PNG, JPEG, WEBP or GIF file.",
        };
      }
      data.avatar = avatar;
    }
  }

  if (Object.keys(data).length === 0) {
    return { success: false, error: "No profile changes were provided." };
  }

  return { success: true, data };
}
