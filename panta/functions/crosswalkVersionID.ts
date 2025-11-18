/**
 * Crosswalk function to convert BB version IDs to Graphai version IDs
 * @param bbVersionID - BB version ID (case-insensitive)
 * @returns Graphai version ID
 * @throws Error if version ID is not mapped
 */
export function crosswalkVersionID(bbVersionID: string): string {
  // Normalize input to lowercase
  const normalizedId = bbVersionID.toLowerCase();

  // Hardcoded mapping table
  const versionMap: Record<string, string> = {
    asv: "ASV1901",
    byz: "BYZ2018",
    clv: "CLV1880",
    kjv: "KJV1769",
    webp: "WEBUS2020",
    ylt: "YLT1898",
  };

  const graphaiID = versionMap[normalizedId];
  if (!graphaiID) {
    throw new Error(
      `Unknown BB version ID: "${bbVersionID}". Supported versions: ${Object.keys(
        versionMap
      ).join(", ")}`
    );
  }

  return graphaiID;
}
