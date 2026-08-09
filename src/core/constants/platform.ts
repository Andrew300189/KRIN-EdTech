export const PLATFORM_CMS_ACCESS_MODE =
  process.env.PLATFORM_CMS_ACCESS_MODE === "owner_and_roles"
    ? "owner_and_roles"
    : "owner_only";
