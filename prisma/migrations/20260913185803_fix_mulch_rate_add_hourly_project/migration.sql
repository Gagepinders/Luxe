-- Data fix (not a schema change): correct Mulch Installation to the
-- business's real installed rate ($160/yard, not $0.85/sqft), and add a
-- generic hourly rate for one-off projects that don't fit a named service.
-- Idempotent — safe to run against any environment regardless of what rates
-- happen to already be seeded there.

INSERT INTO "ServiceType" (id, name, category, "defaultUnit", "defaultRate", active)
VALUES ('svc_mulch_install_v2', 'Mulch Installation', 'landscaping', 'yard', 160, true)
ON CONFLICT (name) DO UPDATE SET "defaultUnit" = EXCLUDED."defaultUnit", "defaultRate" = EXCLUDED."defaultRate";

INSERT INTO "ServiceType" (id, name, category, "defaultUnit", "defaultRate", active)
VALUES ('svc_custom_project_hourly', 'Custom Project (Hourly)', 'landscaping', 'hour', 120, true)
ON CONFLICT (name) DO NOTHING;
