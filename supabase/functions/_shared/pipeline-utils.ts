export function interpolate(text: string, context: Record<string, unknown>): string {
  let result = text;
  const matches = [...result.matchAll(/\{\{([^}]+)\}\}/g)];
  for (const match of matches) {
    const key = match[1];
    if (context[key] === undefined) {
      throw new Error(`Missing required context key: ${key}`);
    }
    const valStr = typeof context[key] === "string" ? context[key] : JSON.stringify(context[key]);
    result = result.split(`{{${key}}}`).join(valStr as string);
  }
  return result;
}

export function evaluateQualityGate(
  qualityScore: number, 
  threshold: number = 0.8
): { passed: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (qualityScore < threshold) {
    warnings.push(`Quality score ${qualityScore.toFixed(2)} is below threshold ${threshold}`);
  }
  return {
    passed: warnings.length === 0,
    warnings
  };
}
