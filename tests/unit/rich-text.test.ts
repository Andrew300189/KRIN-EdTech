/** @jest-environment jsdom */

import { sanitizeLessonRichText } from "@/modules/lessons/utils/rich-text";

describe("sanitizeLessonRichText", () => {
  it("preserves supported formatting and a safe text colour", () => {
    expect(sanitizeLessonRichText('<p><strong>Rule</strong> <span style="color: #5148db">example</span></p>'))
      .toBe('<p><strong>Rule</strong> <span style="color: #5148db">example</span></p>');
  });

  it("removes unsafe markup and attributes while keeping the lesson text", () => {
    const sanitized = sanitizeLessonRichText('<script>alert(1)</script><span style="color: red" onclick="alert(1)">Safe text</span>');

    expect(sanitized).toContain("Safe text");
    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("color: red");
  });
});
