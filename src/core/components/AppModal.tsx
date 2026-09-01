"use client";

import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import styles from "./AppModal.module.css";

export type AppModalSize = "small" | "medium" | "large" | "fullscreen";
export type AppModalCloseReason = "close-button" | "overlay" | "escape" | "discard";

type InitialFocus = "first" | "none" | string | RefObject<HTMLElement | null>;

export type AppModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  headerContent?: ReactNode;
  size?: AppModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;
  initialFocus?: InitialFocus;
  showCloseButton?: boolean;
  compactHeader?: boolean;
  headerClassName?: string;
  bodyClassName?: string;
  tall?: boolean;
  footer?: ReactNode;
  loading?: boolean;
  unsavedChanges?: boolean;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  closeLabel?: string;
  onRequestClose?: (reason: AppModalCloseReason) => void;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

function isSmallTouchViewport() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;
}

/**
 * Application-level accessible dialog. Business flows own their data and submit
 * handlers; this component owns the portal, focus, safe closing and scroll lock.
 */
export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  headerContent,
  size = "medium",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preventClose = false,
  initialFocus = "first",
  showCloseButton = true,
  compactHeader = false,
  headerClassName,
  bodyClassName,
  tall = false,
  footer,
  loading = false,
  unsavedChanges = false,
  className,
  children,
  ariaLabel,
  closeLabel = "Close dialog",
  onRequestClose,
}: AppModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const hasTitle = Boolean(title);
  const isCloseLocked = preventClose || loading;

  useEffect(() => {
    const root = document.createElement("div");
    root.dataset.appModalRoot = "true";
    document.body.appendChild(root);
    setPortalRoot(root);
    return () => root.remove();
  }, []);

  const close = useCallback((reason: AppModalCloseReason) => {
    if (isCloseLocked) return;
    if (unsavedChanges && reason !== "discard") {
      setConfirmDiscard(true);
      return;
    }
    onRequestClose?.(reason);
    onOpenChange(false);
  }, [isCloseLocked, onOpenChange, onRequestClose, unsavedChanges]);
  const closeRef = useRef(close);

  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  useEffect(() => {
    if (!open || !portalRoot) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const body = document.body;
    const documentElement = document.documentElement;
    const originalOverflow = body.style.overflow;
    const originalPaddingRight = body.style.paddingRight;
    const scrollbarGap = Math.max(0, window.innerWidth - documentElement.clientWidth);
    body.style.overflow = "hidden";
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`;

    const hiddenBackground: Array<{ element: HTMLElement; ariaHidden: string | null; inert: boolean }> = [];
    Array.from(body.children).forEach((element) => {
      if (element === portalRoot) return;
      const htmlElement = element as HTMLElement;
      hiddenBackground.push({
        element: htmlElement,
        ariaHidden: htmlElement.getAttribute("aria-hidden"),
        inert: htmlElement.inert,
      });
      htmlElement.inert = true;
      htmlElement.setAttribute("aria-hidden", "true");
    });

    const focusInitialElement = () => {
      const dialog = dialogRef.current;
      if (!dialog || initialFocus === "none" || isSmallTouchViewport()) return;

      let target: HTMLElement | null = null;
      if (typeof initialFocus === "string") target = dialog.querySelector<HTMLElement>(initialFocus);
      if (typeof initialFocus === "object") target = initialFocus.current;
      if (!target) target = dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]");
      if (!target) target = getFocusableElements(dialog)[0] ?? dialog;
      target.focus({ preventScroll: true });
    };

    const frame = window.requestAnimationFrame(focusInitialElement);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        closeRef.current("escape");
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      body.style.overflow = originalOverflow;
      body.style.paddingRight = originalPaddingRight;
      hiddenBackground.forEach(({ element, ariaHidden, inert }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      window.requestAnimationFrame(() => previousFocusRef.current?.focus({ preventScroll: true }));
    };
  }, [closeOnEscape, initialFocus, open, portalRoot]);

  useEffect(() => {
    if (open) setConfirmDiscard(false);
  }, [open]);

  if (!open || !portalRoot) return null;

  const labelledBy = hasTitle ? titleId : undefined;
  const describedBy = description ? descriptionId : undefined;
  const modalClassName = [styles.content, styles[`size${size[0].toUpperCase()}${size.slice(1)}`], tall ? styles.tall : null, className]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <DialogOverlay
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && closeOnOverlayClick) close("overlay");
      }}
    >
      <div
        ref={dialogRef}
        className={modalClassName}
        role="dialog"
        aria-modal="true"
        aria-label={hasTitle ? undefined : ariaLabel ?? "Dialog"}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {(title || headerContent || description || showCloseButton) ? <DialogHeader className={[compactHeader ? styles.compactHeader : null, headerClassName].filter(Boolean).join(" ")}>
          <div className={styles.heading}>
            {headerContent ?? (title ? <DialogTitle id={titleId}>{title}</DialogTitle> : null)}
            {description ? <DialogDescription id={descriptionId}>{description}</DialogDescription> : null}
          </div>
          {showCloseButton ? <DialogClose type="button" onClick={() => close("close-button")} disabled={isCloseLocked} aria-label={closeLabel}><X aria-hidden="true" size={20} strokeWidth={2.25} /></DialogClose> : null}
        </DialogHeader> : null}
        <DialogBody className={bodyClassName}>{children}</DialogBody>
        {confirmDiscard ? <div className={styles.discardPrompt} role="status">
          <p>You have unsaved changes.</p>
          <div className={styles.discardActions}>
            <button type="button" className={styles.secondaryAction} onClick={() => setConfirmDiscard(false)}>Continue editing</button>
            <button type="button" className={styles.dangerAction} onClick={() => close("discard")}>Close without saving</button>
          </div>
        </div> : null}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
        {loading ? <div className={styles.loadingState} role="status" aria-live="polite"><span className={styles.spinner} aria-hidden="true" />Processing…</div> : null}
      </div>
    </DialogOverlay>,
    portalRoot,
  );
}

export function DialogOverlay({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={[styles.overlay, className].filter(Boolean).join(" ")}>{children}</div>;
}

export function DialogContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={[styles.content, className].filter(Boolean).join(" ")}>{children}</div>;
}

export function DialogHeader({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return <header {...props} className={[styles.header, className].filter(Boolean).join(" ")}>{children}</header>;
}

export function DialogTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 {...props} className={[styles.title, className].filter(Boolean).join(" ")}>{children}</h2>;
}

export function DialogDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={[styles.description, className].filter(Boolean).join(" ")}>{children}</p>;
}

export function DialogBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={[styles.body, className].filter(Boolean).join(" ")}>{children}</div>;
}

export function DialogFooter({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return <footer {...props} className={[styles.footer, className].filter(Boolean).join(" ")}>{children}</footer>;
}

export function DialogClose({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={[styles.close, className].filter(Boolean).join(" ")}>{children}</button>;
}

export function DialogTrigger({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={className}>{children}</button>;
}
