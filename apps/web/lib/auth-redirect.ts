export function sanitizeReturnTo(returnTo: string | null | undefined) {
  if (!returnTo) {
    return null;
  }

  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return null;
  }

  return returnTo;
}
