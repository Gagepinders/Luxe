// Pages that render standalone, without the internal CRM sidebar/nav chrome:
// the login screen, customer-facing quote/invoice links, and the public
// instant-quote marketing funnel.
export function isChromelessPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/q/") ||
    pathname.startsWith("/i/") ||
    pathname.startsWith("/quote")
  );
}
