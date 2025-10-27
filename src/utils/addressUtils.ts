import type { Customer } from "../types/customer";

/**
 * Normalize an address string for comparison
 * @param address The address to normalize
 * @returns Normalized address (lowercase, trimmed, single spaces)
 */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Find a customer by exact address match (detailedAddress + area + district)
 * @param customers Array of customers to search
 * @param detailedAddress The detailed address to match
 * @param area Optional area to match
 * @param district Optional district to match
 * @returns Matching customer or undefined
 */
export function findCustomerByAddress(
  customers: Customer[],
  detailedAddress: string,
  area?: string,
  district?: string
): Customer | undefined {
  const normalizedAddress = normalizeAddress(detailedAddress);
  const normalizedArea = area ? normalizeAddress(area) : undefined;
  const normalizedDistrict = district ? normalizeAddress(district) : undefined;

  return customers.find((customer) => {
    const addressMatch = normalizeAddress(customer.detailedAddress) === normalizedAddress;
    const areaMatch = normalizedArea ? normalizeAddress(customer.area) === normalizedArea : true;
    const districtMatch = normalizedDistrict ? normalizeAddress(customer.district) === normalizedDistrict : true;

    return addressMatch && areaMatch && districtMatch;
  });
}
