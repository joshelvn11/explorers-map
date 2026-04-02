export type RouteSearchParams = Record<string, string | string[] | undefined>;

export function getSingleSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
}

export function getOptionalIntegerSearchParam(value: string | string[] | undefined) {
  const singleValue = getSingleSearchParam(value);

  if (!singleValue) {
    return undefined;
  }

  const parsed = Number.parseInt(singleValue, 10);

  return Number.isInteger(parsed) ? parsed : undefined;
}
