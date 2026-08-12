/** @jest-environment jsdom */

import { createElement, useState } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppModal } from "@/core/components/AppModal";

function DialogHarness({ preventClose = false }: { preventClose?: boolean }) {
  const [open, setOpen] = useState(false);
  return createElement(
    "div",
    null,
    createElement("button", { type: "button", onClick: () => setOpen(true) }, "Open dialog"),
    createElement(
      AppModal,
      { open, onOpenChange: setOpen, title: "Account settings", description: "Update your account safely.", preventClose },
      createElement("label", null, "Email", createElement("input", { "data-dialog-initial-focus": true, type: "email" })),
    ),
  );
}

describe("AppModal", () => {
  beforeEach(() => {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };
    window.cancelAnimationFrame = () => undefined;
  });

  it("opens with an accessible heading, locks background scrolling and closes on Escape", () => {
    render(createElement(DialogHarness));
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Account settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account settings" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByLabelText("Email")).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
  });

  it("traps Tab within the dialog and permits overlay close when safe", () => {
    render(createElement(DialogHarness));
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const input = screen.getByLabelText("Email");
    input.focus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();

    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not close a dialog whose operation is marked as critical", () => {
    render(createElement(DialogHarness, { preventClose: true }));
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByRole("dialog", { name: "Account settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeDisabled();
  });
});
