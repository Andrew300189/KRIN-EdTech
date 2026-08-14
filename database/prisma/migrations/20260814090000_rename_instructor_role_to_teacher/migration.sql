-- Preserve all existing users and permissions while standardising the
-- application role name from INSTRUCTOR to TEACHER.
ALTER TYPE "Role" RENAME VALUE 'INSTRUCTOR' TO 'TEACHER';
