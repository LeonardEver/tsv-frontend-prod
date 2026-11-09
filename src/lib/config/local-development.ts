/** Development UI requests may target only a loopback API. Names such as
 * localhost.example.com and credentials containing localhost are not local. */
export function isLoopbackHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol)
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      && !url.username && !url.password;
  } catch { return false; }
}
