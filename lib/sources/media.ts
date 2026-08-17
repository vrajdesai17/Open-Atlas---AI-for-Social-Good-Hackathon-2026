export async function extractMediaLinks(
  input: string,
): Promise<{ links: string[] } | null> {
  const tokens = input.split(/[\s,]+/);
  const links: string[] = [];

  for (const token of tokens) {
    if (!token) continue;
    try {
      new URL(token);
      links.push(token);
    } catch {
      // Ignore invalid URLs
    }
  }

  return links.length ? { links } : null;
}
