import { getRegionHandler } from "@/lib/actions-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ countrySlug: string; regionSlug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  return getRegionHandler(request, await params);
}
