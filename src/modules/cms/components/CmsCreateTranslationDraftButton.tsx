"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  courseId: string;
  locale: string;
  className?: string;
  errorClassName?: string;
};

export function CmsCreateTranslationDraftButton({ courseId, locale, className, errorClassName }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function createDraft() {
    startTransition(async () => {
      try {
        setError(null);
        const response = await fetch(`/api/admin/cms/courses/${courseId}/translations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, action: "CREATE_DRAFT" }),
        });
        const payload = await response.json() as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to create translation draft.");
        router.push(`/cms/translations?course=${courseId}&locale=${locale}`);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to create translation draft.");
      }
    });
  }

  return (
    <>
      <button type="button" className={className} disabled={isPending} onClick={createDraft}>
        {isPending ? "Creating draft…" : "Create draft"}
      </button>
      {error ? <span role="alert" className={errorClassName}>{error}</span> : null}
    </>
  );
}
