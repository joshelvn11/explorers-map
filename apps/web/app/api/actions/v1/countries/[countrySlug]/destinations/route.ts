import { createDestinationHandler, listDestinationsHandler } from "@/lib/actions-handlers";
import { actionsRouteConfig } from "@/lib/actions-api";

export const runtime = actionsRouteConfig.runtime;
export const dynamic = actionsRouteConfig.dynamic;

type RouteContext = {
  params: Promise<{ countrySlug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  return listDestinationsHandler(request, await params);
}

export async function POST(request: Request, { params }: RouteContext) {
  return createDestinationHandler(request, await params);
}
