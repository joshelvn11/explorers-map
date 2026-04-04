import { getDestinationHandler } from "@/lib/actions-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ countrySlug: string; destinationSlug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  return getDestinationHandler(request, await params);
}
