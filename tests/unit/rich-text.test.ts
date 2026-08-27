/** @jest-environment jsdom */

import { sanitizeLessonRichText } from "@/modules/lessons/utils/rich-text";

describe("sanitizeLessonRichText", () => {
  it("preserves supported formatting and a safe text colour", () => {
    const sanitized = sanitizeLessonRichText('<p><strong>Rule</strong> <span style="color: #5148db">example</span></p>');

    expect(sanitized).toContain("<strong>Rule</strong>");
    expect(sanitized).toContain("color: rgb(81, 72, 219)");
  });

  it("removes unsafe markup and attributes while keeping the lesson text", () => {
    const sanitized = sanitizeLessonRichText('<script>alert(1)</script><span style="color: red" onclick="alert(1)">Safe text</span>');

    expect(sanitized).toContain("Safe text");
    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).toContain("color: red");
  });

  it("keeps paragraphs created with Enter in the rich-text editor", () => {
    expect(sanitizeLessonRichText("First paragraph<div>Second paragraph</div>"))
      .toBe("First paragraph<div>Second paragraph</div>");
  });

  it("preserves safe copied document formatting and removes unsafe CSS", () => {
    const sanitized = sanitizeLessonRichText(`
      <div style="text-align: center; color: rgb(14, 116, 144); font-size: 18px; background-image: url(https://bad.example/image.png)">
        <strong>Centred title</strong>
      </div>
      <table style="width: 100%; border-collapse: collapse"><tr><th>Form</th><td colspan="2">Example</td></tr></table>
    `);

    expect(sanitized).toContain("text-align: center");
    expect(sanitized).toContain("color: rgb(14, 116, 144)");
    expect(sanitized).toContain("font-size: 18px");
    expect(sanitized).toContain("<table");
    expect(sanitized).toContain('colspan="2"');
    expect(sanitized).not.toContain("background-image");
    expect(sanitized).not.toContain("bad.example");
  });
});
