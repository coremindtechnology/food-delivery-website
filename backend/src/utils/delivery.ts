export const MAX_DELIVERY_DISTANCE_KM = 5;

const KITCHEN_LOCATIONS = {
  veg: { latitude: 23.3204059, longitude: 77.490663 },
  "non-veg": { latitude: 23.3010945, longitude: 77.4341936 },
} as const;

export function getDeliveryDistanceKm(
  restaurantSlug: keyof typeof KITCHEN_LOCATIONS,
  coordinates: { latitude: number; longitude: number }
): number {
  const kitchen = KITCHEN_LOCATIONS[restaurantSlug];
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDifference = toRadians(coordinates.latitude - kitchen.latitude);
  const longitudeDifference = toRadians(coordinates.longitude - kitchen.longitude);
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(kitchen.latitude)) *
      Math.cos(toRadians(coordinates.latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
