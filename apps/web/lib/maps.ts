type MapLocation = {
  latitude: number;
  longitude: number;
  googleMapsPlaceUrl?: string | null;
};

export function getPreferredMapHref(location: MapLocation) {
  if (location.googleMapsPlaceUrl && location.googleMapsPlaceUrl.trim().length > 0) {
    return location.googleMapsPlaceUrl;
  }

  return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
}
