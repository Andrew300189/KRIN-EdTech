-- Application entry points normalize email addresses. Enforce the same rule
-- in PostgreSQL so a manual or future write cannot introduce accounts that
-- differ only by case or surrounding whitespace.
UPDATE "User"
SET "email" = lower(btrim("email"))
WHERE "email" <> lower(btrim("email"));

CREATE UNIQUE INDEX "User_email_normalized_key"
  ON "User" (lower(btrim("email")));
