#!/usr/bin/env bash
set -euo pipefail

echo "Stopping Keycloak so the export reads a consistent, unlocked database..."
docker compose stop keycloak

echo "Exporting the forest realm (including users, roles, clients)..."
docker compose run --rm --no-deps \
  --entrypoint /opt/keycloak/bin/kc.sh \
  keycloak export \
  --dir /opt/keycloak/data/export \
  --realm forest \
  --users realm_file

echo "Restarting Keycloak..."
docker compose start keycloak

echo "Copying the export out of the named volume onto the host..."
docker run --rm \
  -v keycloak_data:/data \
  -v "$(pwd)/keycloak/import":/out \
  --user "$(id -u):$(id -g)" \
  alpine cp /data/export/forest-realm.json /out/realm-forest.json

echo "Done. keycloak/import/realm-forest.json now reflects Keycloak's live state."
echo "Review the diff before committing — see notes below."
