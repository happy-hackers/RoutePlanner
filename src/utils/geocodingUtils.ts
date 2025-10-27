import hongKongAreas from "../hong_kong_areas.json";

export interface GeocodingResult {
  lat: number;
  lng: number;
  area: string;
  district: string;
}

/**
 * Geocode an address using Google Maps API and extract Hong Kong area/district
 * @param address The address to geocode
 * @param geocoder Google Maps Geocoder instance
 * @returns Promise with lat, lng, area, and district
 */
export async function geocodeAddressWithDetails(
  address: string,
  geocoder: google.maps.Geocoder
): Promise<GeocodingResult> {
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: `${address}, Hong Kong` }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
        const result = results[0];
        const loc = result.geometry.location;

        try {
          // Extract area and district from address components
          const { area, district } = extractAreaAndDistrict(result.address_components);

          resolve({
            lat: loc.lat(),
            lng: loc.lng(),
            area: area || "",
            district: district || "",
          });
        } catch (error) {
          reject(`Failed to extract area/district for "${address}": ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      } else {
        reject(`Geocode failed for "${address}" with status: ${status}`);
      }
    });
  });
}

/**
 * Extract Hong Kong area and district from Google geocoding address components
 */
function extractAreaAndDistrict(
  components: google.maps.GeocoderAddressComponent[] | undefined
): { area: string; district: string } {
  let area = "";
  let district = "";

  // Check if components exist and is an array
  if (!components || !Array.isArray(components) || components.length === 0) {
    return { area: "", district: "" };
  }

  // Try to find district from neighborhood or sublocality
  const districtComponent = components.find(
    (c) =>
      c.types.includes("neighborhood") ||
      c.types.includes("sublocality") ||
      c.types.includes("sublocality_level_1")
  );

  if (districtComponent) {
    const districtName = districtComponent.long_name;
    // Find which area this district belongs to
    const areaMatch = findAreaForDistrict(districtName);
    if (areaMatch) {
      area = areaMatch.area;
      district = areaMatch.district;
    }
  }

  // If not found, try to extract from administrative_area_level_1 or locality
  if (!area || !district) {
    const areaComponent = components.find(
      (c) =>
        c.types.includes("administrative_area_level_1") ||
        c.types.includes("locality")
    );

    if (areaComponent) {
      const areaName = areaComponent.long_name;
      const areaMatch = findBestMatchForArea(areaName);
      if (areaMatch) {
        area = areaMatch.area;
        district = areaMatch.district || "";
      }
    }
  }

  return { area, district };
}

/**
 * Find which area a district belongs to by searching hong_kong_areas.json
 */
function findAreaForDistrict(districtName: string): { area: string; district: string } | null {
  const normalizedDistrict = districtName.toLowerCase().trim();

  for (const [areaName, districts] of Object.entries(hongKongAreas)) {
    for (const [districtKey, subDistricts] of Object.entries(districts)) {
      // Check if district key matches
      if (districtKey.toLowerCase().includes(normalizedDistrict) ||
          normalizedDistrict.includes(districtKey.toLowerCase())) {
        return { area: areaName, district: districtKey };
      }

      // Check sub-districts array
      if (Array.isArray(subDistricts)) {
        const match = subDistricts.find((sd: string) =>
          sd.toLowerCase().includes(normalizedDistrict) ||
          normalizedDistrict.includes(sd.toLowerCase())
        );
        if (match) {
          return { area: areaName, district: districtKey };
        }
      }
    }
  }

  return null;
}

/**
 * Find best matching area for a given area name
 */
function findBestMatchForArea(areaName: string): { area: string; district: string } | null {
  const normalized = areaName.toLowerCase().trim();

  // Direct area name matches
  const areaNames = Object.keys(hongKongAreas);
  for (const area of areaNames) {
    if (area.toLowerCase().includes(normalized) || normalized.includes(area.toLowerCase())) {
      // Return first district of this area as default
      const districts = Object.keys(hongKongAreas[area as keyof typeof hongKongAreas]);
      return { area, district: districts[0] || "" };
    }
  }

  // Special cases for common names
  if (normalized.includes("kowloon")) {
    return { area: "Kowloon", district: Object.keys(hongKongAreas.Kowloon)[0] };
  }
  if (normalized.includes("hong kong") || normalized.includes("hk island")) {
    return { area: "Hong Kong Island", district: Object.keys(hongKongAreas["Hong Kong Island"])[0] };
  }
  if (normalized.includes("new territories") || normalized.includes("n.t.")) {
    return { area: "New Territories", district: Object.keys(hongKongAreas["New Territories"])[0] };
  }

  return null;
}
