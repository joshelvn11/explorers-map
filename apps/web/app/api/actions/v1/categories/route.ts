import { listCategoriesHandler } from "@/lib/actions-handlers";
import { actionsRouteConfig } from "@/lib/actions-api";

export const runtime = actionsRouteConfig.runtime;
export const dynamic = actionsRouteConfig.dynamic;

export function GET(request: Request) {
  return listCategoriesHandler(request);
}
