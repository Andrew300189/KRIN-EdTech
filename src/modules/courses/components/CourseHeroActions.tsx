"use client";

import Link from "next/link";
import { useEffect } from "react";

type CourseHeroActionsProps = {
  actionClassName: string;
  containerClassName: string;
  startCourseHref: string | null;
};

export function CourseHeroActions({
  actionClassName,
  containerClassName,
  startCourseHref,
}: CourseHeroActionsProps) {
  function showCourseContent() {
    const contentDialog = document.getElementById("course-content-dialog");
    if (contentDialog instanceof HTMLDialogElement && !contentDialog.open) {
      contentDialog.showModal();
    }
  }

  function showPurchaseOptions() {
    const purchasePanel = Array.from(
      document.querySelectorAll<HTMLElement>("[data-course-purchase]"),
    ).find((element) => element.offsetParent !== null);

    purchasePanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("content") !== "open") return;
    showCourseContent();
    url.searchParams.delete("content");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return (
    <div className={containerClassName}>
      <button type="button" className={actionClassName} onClick={showCourseContent}>
        Show Content
      </button>
      {startCourseHref ? (
        <Link href={startCourseHref} className={actionClassName}>
          Start Course
        </Link>
      ) : (
        <button type="button" className={actionClassName} onClick={showPurchaseOptions}>
          Start Course
        </button>
      )}
    </div>
  );
}
