/** @jest-environment jsdom */

import { getRememberedLoginEmail, rememberLoginEmail } from "@/modules/auth/utils/remembered-login-email";

describe("remembered login email", () => {
  beforeEach(() => window.localStorage.clear());

  it("stores the registered email, not a username", () => {
    rememberLoginEmail(" Person@Example.com ");
    expect(getRememberedLoginEmail()).toBe("person@example.com");
    rememberLoginEmail("person_username");
    expect(getRememberedLoginEmail()).toBe("person@example.com");
  });

  it("ignores invalid stored values", () => {
    window.localStorage.setItem("krin-last-login-email", "person_username");
    expect(getRememberedLoginEmail()).toBe("");
  });
});
