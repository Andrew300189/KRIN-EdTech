import {
  displayName,
  profileNameParts,
  validateUserProfilePatch,
} from "@/core/server/profile";

describe("profile validation", () => {
  it("accepts editable profile fields and a supported image", () => {
    expect(
      validateUserProfilePatch({
        firstName: "  Anna  ",
        lastName: "Smith",
        interfaceLanguage: "uk",
        timeZone: "Europe/Kyiv",
        country: "Ukraine",
        avatar: "data:image/png;base64,aGVsbG8=",
      }),
    ).toEqual({
      success: true,
      data: {
        firstName: "Anna",
        lastName: "Smith",
        interfaceLanguage: "uk",
        timeZone: "Europe/Kyiv",
        country: "Ukraine",
        avatar: "data:image/png;base64,aGVsbG8=",
      },
    });
  });

  it("does not allow an email address in a profile update", () => {
    expect(validateUserProfilePatch({ email: "new@example.com" })).toEqual({
      success: false,
      error: "Email cannot be changed.",
    });
  });

  it("rejects invalid time zones and unsupported avatar sources", () => {
    expect(validateUserProfilePatch({ timeZone: "Mars/Olympus" })).toMatchObject({
      success: false,
    });
    expect(validateUserProfilePatch({ avatar: "http://not-secure.example/photo.png" })).toMatchObject({
      success: false,
    });
  });

  it("keeps the display name synchronized with first and last names", () => {
    expect(displayName("Anna", "Smith")).toBe("Anna Smith");
    expect(profileNameParts("Anna Maria Smith")).toEqual({
      firstName: "Anna",
      lastName: "Maria Smith",
    });
  });
});
