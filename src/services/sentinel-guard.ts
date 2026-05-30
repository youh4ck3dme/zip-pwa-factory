import { StepOutputSchema } from "../types/pipeline";
import { z } from "zod";

export function sentinelGuard(
  output: z.infer<typeof StepOutputSchema>,
  threshold: number = parseFloat(process.env.SENTINEL_THRESHOLD || "0.8")
): boolean {
  // PWA-specific checks
  switch (output.key) {
    case "manifest":
      return validateManifest(output.data) && output.qualityScore >= threshold;
    case "serviceWorkerCode":
      return validateServiceWorker(output.data) && output.qualityScore >= threshold;
    case "deploymentConfig":
      return validateDeploymentConfig(output.data) && output.qualityScore >= threshold;
    case "icons":
      return validateIcons(output.data) && output.qualityScore >= threshold;
    default:
      return output.qualityScore >= threshold;
  }
}

function validateManifest(manifest: any): boolean {
  // Basic validation for Web App Manifest
  const requiredFields = ["name", "short_name", "start_url", "display"];
  return requiredFields.every(field => field in manifest);
}

function validateServiceWorker(code: string): boolean {
  // Check for essential Service Worker methods
  const requiredMethods = ["self.addEventListener", "fetch", "caches"];
  return requiredMethods.every(method => code.includes(method));
}

function validateDeploymentConfig(config: any): boolean {
  // Basic validation for deployment config
  return config && typeof config === "object" && Object.keys(config).length > 0;
}

function validateIcons(icons: any): boolean {
  // Validate PWA icons
  if (!icons || typeof icons !== "object") return false;
  
  // Check if we have at least one icon
  if (!Array.isArray(icons) && !icons.src) return false;
  
  // If it's an array, check for required sizes
  if (Array.isArray(icons)) {
    const requiredSizes = ["192x192", "512x512"];
    return icons.some((icon: any) => 
      requiredSizes.some(size => icon.sizes?.includes(size))
    );
  }
  
  return true;
}

// Quality scoring functions
export function calculateManifestQuality(manifest: any): number {
  let score = 0.5; // Base score
  
  // Check required fields
  const requiredFields = ["name", "short_name", "start_url", "display", "theme_color", "background_color"];
  const fieldScore = requiredFields.filter(field => field in manifest).length / requiredFields.length;
  score += fieldScore * 0.3;
  
  // Check icons
  if (manifest.icons && Array.isArray(manifest.icons) && manifest.icons.length >= 2) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
}

export function calculateServiceWorkerQuality(code: string): number {
  let score = 0.5; // Base score
  
  // Check for essential methods
  const essentialMethods = [
    "self.addEventListener('install'",
    "self.addEventListener('fetch'",
    "self.addEventListener('activate'",
    "caches.open(",
    "caches.match(",
    "event.respondWith("
  ];
  
  const methodScore = essentialMethods.filter(method => code.includes(method)).length / essentialMethods.length;
  score += methodScore * 0.4;
  
  // Check for precaching logic
  if (code.includes("precache") || code.includes("cache.addAll")) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0);
}
