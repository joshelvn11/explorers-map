import { openApiDraftOnlyHandler } from "@/lib/actions-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return openApiDraftOnlyHandler();
}
