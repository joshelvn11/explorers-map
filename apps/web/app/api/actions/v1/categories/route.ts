import { listCategoriesHandler } from "@/lib/actions-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return listCategoriesHandler(request);
}
