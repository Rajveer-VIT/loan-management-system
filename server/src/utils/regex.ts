/**
 * Escapes special regex characters in user search strings to prevent ReDoS and regex injection.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
