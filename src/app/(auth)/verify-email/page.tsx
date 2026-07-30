"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Status = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    void verify();
  }, [searchParams]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      {status === "loading" ? (
        <>
          <h1 className="text-2xl font-bold">Verifying Email...</h1>
          <p className="text-gray-600 mt-3">
            Please wait while we activate your account.
          </p>
        </>
      ) : null}

      {status === "success" ? (
        <>
          <h1 className="text-2xl font-bold">Email verified</h1>
          <p className="text-gray-600 mt-3">
            Your account is now active. You can continue learning.
          </p>
          <Link href="/dashboard" className="btn btn-primary mt-6 inline-flex">
            Open Dashboard
          </Link>
        </>
      ) : null}

      {status === "error" ? (
        <>
          <h1 className="text-2xl font-bold">Verification failed</h1>
          <p className="text-gray-600 mt-3">
            The verification link is invalid or expired.
          </p>
          <Link
            href="/auth/login"
            className="btn btn-secondary mt-6 inline-flex"
          >
            Back to Sign In
          </Link>
        </>
      ) : null}
    </div>
  );
}
