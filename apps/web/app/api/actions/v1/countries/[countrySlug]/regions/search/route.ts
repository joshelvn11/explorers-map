import { searchRegionsHandler } from "@/lib/actions-handlers";
import { actionsRouteConfig } from "@/lib/actions-api";

export const runtime = actionsRouteConfig.runtime;
export const dynamic = actionsRouteConfig.dynamic;

type RouteContext = {
  params: Promise<{ countrySlug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  return searchRegionsHandler(request, await params);
}
