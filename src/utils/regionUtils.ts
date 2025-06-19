import melbournePostcodeRegions from "../melbourne_postcode_regions.json";

const getRegionByPostcode = (postcode: number): string => {
  const region = melbournePostcodeRegions.find(
    (region) => region.postcode === postcode
  );
  return region?.region || "";
};

export { getRegionByPostcode };
