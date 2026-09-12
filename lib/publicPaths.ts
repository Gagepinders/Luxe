// Pages that render standalone, without the internal CRM sidebar/nav chrome:
// the login screen, and customer-facing quote/invoice links.
export function isChromelessPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/q/") || pathname.startsWith("/i/");
}
