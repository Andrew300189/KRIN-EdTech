"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/core/components/AppModal";
import { LoginForm } from "./LoginForm";
import { RegistrationForm } from "./RegistrationForm";
import styles from "./LoginModal.module.css";

type LoginIntent = "learner" | "teacher";
type AuthView = "login" | "register";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  nextPath?: string;
  intent?: LoginIntent;
  initialView?: AuthView;
  notice?: { message: string; tone?: "info" | "error"; errorId?: string };
};

/**
 * Shared account dialog. Authentication retains its own server-side redirects;
 * the dialog owns only presentation and view switching.
 */
export function LoginModal({
  open,
  onClose,
  nextPath,
  intent = "learner",
  initialView = "login",
  notice,
}: LoginModalProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState("");
  const isTeacherLogin = intent === "teacher";

  useEffect(() => {
    if (open) setView(initialView);
  }, [initialView, open]);

  const isRegistration = view === "register" && !isTeacherLogin;
  const titleText = isRegistration
    ? "Create your KRIN EdTech account"
    : isTeacherLogin
      ? "Log in to your teacher dashboard"
      : "KRIN EdTech";
  const eyebrow = isRegistration ? "JOIN KRIN EDTECH" : isTeacherLogin ? "TEACHER AREA" : "WELCOME BACK";
  const description = isRegistration
    ? "Set up your account to save your learning and continue where you left off."
    : isTeacherLogin
      ? "Use your teacher account to manage learners and courses."
      : "";

  return <AppModal
    open={open}
    onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}
    size="medium"
    title={<span className={styles.titleWrap}><span className={styles.eyebrow}>{eyebrow}</span><span>{titleText}</span></span>}
    description={description}
    closeLabel="Close account dialog"
    initialFocus="[data-dialog-initial-focus]"
  >
    {notice ? <div role={notice.tone === "error" ? "alert" : "status"} className={notice.tone === "error" ? styles.errorNotice : styles.infoNotice}><p>{notice.message}</p>{notice.errorId ? <p className={styles.errorId}>Error ID: <code>{notice.errorId}</code></p> : null}</div> : null}
    {isRegistration
      ? <RegistrationForm nextPath={nextPath} initialEmail={email} onNavigate={onClose} onSignIn={(nextEmail) => { setEmail(nextEmail); setView("login"); }} />
      : <LoginForm nextPath={nextPath} onNavigate={onClose} email={email} onEmailChange={setEmail} showRegistration={!isTeacherLogin} onCreateAccount={(nextEmail) => { setEmail(nextEmail); setView("register"); }} />}
  </AppModal>;
}
