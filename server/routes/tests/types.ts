/**
 * Shared type definition for system test entries.
 * Each test has a name, description, async test function, and troubleshooting suggestions.
 */
export interface SystemTest {
  name: string;
  description: string;
  test: () => Promise<{ passed: boolean; details: string }>;
  suggestions: string[];
}
