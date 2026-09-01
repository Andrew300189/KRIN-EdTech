"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "@/modules/lessons/components/FocusLessonPlayer.module.css";

type ReviewEligibility = {
  eligible: boolean;
  courseTitle: string | null;
  existingRating: number | null;
  existingComment: string | null;
};

export function CourseCompletionReview({ courseSlug, active }: { courseSlug: string; active: boolean }) {
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setLoading(true);
    setEligibility(null);
    setNotice("");
    setError("");

    void fetch(`/api/courses/${encodeURIComponent(courseSlug)}/review`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => ({ response, payload: await response.json().catch(() => null) }))
      .then(({ response, payload }) => {
        if (!response.ok || controller.signal.aborted) return;
        const data = payload?.data as ReviewEligibility | undefined;
        if (!data) return;
        setEligibility(data);
        setRating(data.existingRating ?? 0);
        setComment(data.existingComment ?? "");
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [active, courseSlug]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = comment.trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 7) {
      setError("Choose a rating from 1 to 7 stars.");
      return;
    }
    if (value.length < 3) {
      setError("Write at least 3 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/courses/${encodeURIComponent(courseSlug)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: value }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save your comment.");
      setRating(payload.data.rating);
      setComment(payload.data.comment);
      setEligibility((current) => current ? { ...current, existingRating: payload.data.rating, existingComment: payload.data.comment } : current);
      setNotice("Your course comment is saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save your comment.");
    } finally {
      setSaving(false);
    }
  }

  if (!active || loading || !eligibility?.eligible) return null;

  return (
    <form className={styles.courseReview} onSubmit={submit}>
      <div>
        <h3>Comment on this course</h3>
        <p>You've completed the full paid course. Choose your rating, then share what was useful for you.</p>
      </div>
      <fieldset className={styles.courseRating}>
        <legend>Your rating: {rating ? `${rating}/7` : "choose 1–7"}</legend>
        <div className={styles.courseRatingStars} role="radiogroup" aria-label="Course rating from 1 to 7 stars">
          {Array.from({ length: 7 }, (_, index) => {
            const value = index + 1;
            return <button
              key={value}
              type="button"
              className={rating >= value ? styles.courseRatingStarSelected : styles.courseRatingStar}
              onClick={() => setRating(value)}
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} of 7 stars`}
              title={`${value} of 7 stars`}
            >★</button>;
          })}
        </div>
      </fieldset>
      <label htmlFor={`course-review-${courseSlug}`}>Your comment</label>
      <textarea
        id={`course-review-${courseSlug}`}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        minLength={3}
        maxLength={2_000}
        required
        placeholder="Write your thoughts about the course"
      />
      {error ? <p className={styles.courseReviewError} role="alert">{error}</p> : null}
      {notice ? <p className={styles.courseReviewNotice} role="status">{notice}</p> : null}
      <div className={styles.courseReviewActions}>
        <span>{comment.trim().length}/2000</span>
        <button type="submit" className={styles.reviewAllButton} disabled={saving || rating < 1 || comment.trim().length < 3}>
          {saving ? "Saving…" : eligibility.existingComment ? "Update comment" : "Publish comment"}
        </button>
      </div>
    </form>
  );
}
