import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import promptSync from "prompt-sync";

const prompt = promptSync();

// Get version argument
const newVersion = process.argv[2];
if (!newVersion) {
  console.error(
    "Please provide a version number (e.g., npm run version 1.0.1)"
  );
  process.exit(1);
}

// Validate version format
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error("Version must be in format x.y.z (e.g., 1.0.1)");
  process.exit(1);
}

try {
  // Update manifest.json
  const manifestPath = "manifest.json";
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.version = newVersion;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + "\n");
  console.log(`Updated ${manifestPath} to version ${newVersion}`);

  // Update package.json
  const packagePath = "package.json";
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  pkg.version = newVersion;
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`Updated ${packagePath} to version ${newVersion}`);

  // Git commands
  execSync("git add manifest.json package.json");
  execSync(`git commit -m "chore: bump version to ${newVersion}"`);
  execSync(`git tag -a ${newVersion} -m "Version ${newVersion}"`);
  console.log(`Created git tag v${newVersion}`);

  console.log("\nNext steps:");
  console.log("1. Push the changes: git push");
  console.log("2. Push the tag: git push origin --tags");

  const answer = prompt("Do this automatically? (y/n) ").toLowerCase();
  if (answer === "y" || answer === "yes") {
    console.log("\nPushing changes and tags...");
    execSync("git push");
    execSync("git push origin --tags");
    console.log("Done!");
  }
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
