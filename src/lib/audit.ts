import "server-only";
import { db, schema } from "@/db";

export async function audit(
  userId: string | null,
  action: string,
  subject?: { type: string; id: string },
  detail?: string,
) {
  await db.insert(schema.auditEvents).values({
    userId,
    action,
    subjectType: subject?.type,
    subjectId: subject?.id,
    detail,
  });
}
