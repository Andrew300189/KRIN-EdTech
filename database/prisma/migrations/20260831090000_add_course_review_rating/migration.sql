-- Reviews created before ratings were introduced retain the highest rating.
-- New reviews are validated by both the API and this database constraint.
ALTER TABLE "CourseReview"
  ADD COLUMN "rating" INTEGER NOT NULL DEFAULT 7;

ALTER TABLE "CourseReview"
  ADD CONSTRAINT "CourseReview_rating_range"
  CHECK ("rating" >= 1 AND "rating" <= 7);
