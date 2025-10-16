import * as fs from "fs";
import * as path from "path";

/**
 * Ensures a directory exists, creating it recursively if necessary
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Reads and parses a JSON file
 */
export function readJsonFile<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

/**
 * Writes data to a JSON file with proper formatting
 */
export function writeJsonFile(filePath: string, data: any): void {
  const dirPath = path.dirname(filePath);
  ensureDirectoryExists(dirPath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Lists all subdirectories in a given directory
 */
export function listDirectories(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

/**
 * Lists all files in a directory matching a pattern
 */
export function listFiles(dirPath: string, extension?: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name);

  if (extension) {
    return files.filter((file) => file.endsWith(extension));
  }

  return files;
}

/**
 * Checks if a file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Gets file size in bytes
 */
export function getFileSize(filePath: string): number {
  if (!fileExists(filePath)) {
    return 0;
  }
  return fs.statSync(filePath).size;
}
