export function getAppUrl() {
  return (process.env.APP_URL || "https://luxe-crm-app-production.up.railway.app").replace(/\/$/, "");
}
