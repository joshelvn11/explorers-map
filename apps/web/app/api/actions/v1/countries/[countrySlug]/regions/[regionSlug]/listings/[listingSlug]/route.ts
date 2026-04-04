import { getListingHandler } from "@/lib/actions-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ countrySlug: string; regionSlug: string; listingSlug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  return getListingHandler(request, await params);
}
