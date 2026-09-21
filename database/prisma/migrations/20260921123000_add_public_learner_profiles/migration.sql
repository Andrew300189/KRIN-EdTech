-- A learner must opt in separately before course progress and aggregate
-- statistics become visible on their public learner card.
ALTER TABLE "User"
  ADD COLUMN "showPublicProfile" BOOLEAN NOT NULL DEFAULT false;
