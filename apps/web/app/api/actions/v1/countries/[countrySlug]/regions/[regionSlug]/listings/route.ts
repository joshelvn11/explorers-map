import { createListingHandler, listRegionListingsHandler } from "@/lib/actions-handlers";
import { actionsRouteConfig } from "@/lib/actions-api";

export const runtime = actionsRouteConfig.runtime;
export const dynamic = actionsRouteConfig.dynamic;

type RouteContext = {
  params: Promise<{ countrySlug: string; regionSlug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  return listRegionListingsHandler(request, await params);
}

export async function POST(request: Request, { params }: RouteContext) {
  return createListingHandler(request, await params);
}
