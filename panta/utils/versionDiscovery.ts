import { readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Discovers all available Bible versions by scanning the bible-versions directory
 * @param versionsDir - Path to the bible-versions directory (default: "./bible-versions")
 * @returns Array of version identifiers (directory names)
 */
export function discoverVersions(
  versionsDir: string = "./bible-versions"
): string[] {
  try {
    const entries = readdirSync(versionsDir);
    const versions: string[] = [];

    for (const entry of entries) {
      const fullPath = join(versionsDir, entry);
      const stat = statSync(fullPath);

      // Only include directories (versions are stored as directories)
      if (stat.isDirectory()) {
        versions.push(entry);
      }
    }

    return versions.sort(); // Sort for consistent ordering
  } catch (error) {
    throw new Error(`Failed to discover versions in ${versionsDir}: ${error}`);
  }
}
