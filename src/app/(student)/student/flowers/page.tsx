import { requireRole } from "@/core/server/role-guard";
import { getFlowerCollection } from "@/modules/motivation/services/flower-collection.service";
import { FlowerCollection } from "@/modules/motivation/components/FlowerCollection";

export default async function StudentFlowersPage() {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;
  const collection = await getFlowerCollection(guard.user.id);
  return <FlowerCollection initialCollection={collection} />;
}
