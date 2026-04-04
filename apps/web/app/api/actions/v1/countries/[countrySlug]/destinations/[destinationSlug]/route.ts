import { getDestinationHandler } from "@/lib/actions-handlers";
import { actionsRouteConfig } from "@/lib/actions-api";

export const runtime = actionsRouteConfig.runtime;
export const dynamic = actionsRouteConfig.dynamic;

type RouteContext = {
  params: Promise<{ countrySlug: string; destinationSlug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  return getDestinationHandler(request, await params);
}
