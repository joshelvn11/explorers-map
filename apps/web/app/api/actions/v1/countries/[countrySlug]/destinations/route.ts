import { createDestinationHandler, listDestinationsHandler } from "@/lib/actions-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ countrySlug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  return listDestinationsHandler(request, await params);
}

export async function POST(request: Request, { params }: RouteContext) {
  return createDestinationHandler(request, await params);
}
