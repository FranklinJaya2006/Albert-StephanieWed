#!/usr/bin/env bash
# Run on the VPS after the initial stack has been bootstrapped.
set -euo pipefail
service="${1:?component required}"
tag="${2:?image SHA/tag required}"
revision="${3:-0}"
[[ "$revision" =~ ^[0-9]+$ ]] || { echo "Invalid deployment revision" >&2; exit 2; }
case "$service" in web|admin|edge) ;; *) echo "Unknown component" >&2; exit 2 ;; esac
[[ "$tag" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ ]] || { echo "Invalid image tag" >&2; exit 2; }
[[ -f .env && -f docker-compose.prod.yml ]] || { echo "Missing VPS .env or compose file" >&2; exit 2; }
# Also serialize manual updates with CI updates.
exec 9>.deploy.lock
flock -w 300 9
services=("$service")
if [[ "$service" == web || "$service" == admin ]]; then services=(back "$service"); fi
state=.image-tags.env
runkey="${service^^}_DEPLOY_RUN"
if [[ "$revision" != 0 && -f "$state" ]]; then
  previous=$(sed -n "s/^${runkey}=//p" "$state")
  if [[ "$previous" =~ ^[0-9]+$ ]] && (( revision < previous )); then
    echo "Skipping an older $service deployment"
    exit 0
  fi
fi
# Both frontends share one API. A late older frontend release must not downgrade it.
if [[ "$service" != edge && "$revision" != 0 && -f "$state" ]]; then
  api_revision=$(sed -n 's/^BACK_DEPLOY_RUN=//p' "$state")
  if [[ "$api_revision" =~ ^[0-9]+$ ]] && (( revision < api_revision )); then services=("$service"); fi
fi
candidate=$(mktemp .image-tags.XXXXXX)
trap 'rm -f "$candidate"' EXIT
if [[ -f "$state" ]]; then cp "$state" "$candidate"; fi
for component in "${services[@]}"; do
  key="${component^^}_IMAGE_TAG"
  sed -i "/^${key}=/d" "$candidate"
  printf '%s=%s\n' "$key" "$tag" >> "$candidate"
  if [[ "$component" == back && "$revision" != 0 ]]; then
    sed -i '/^BACK_DEPLOY_RUN=/d' "$candidate"
    printf 'BACK_DEPLOY_RUN=%s\n' "$revision" >> "$candidate"
  fi
done
if [[ "$revision" != 0 ]]; then
  sed -i "/^${runkey}=/d" "$candidate"
  printf '%s=%s\n' "$runkey" "$revision" >> "$candidate"
fi
compose=(docker compose --env-file .env --env-file "$candidate" -f docker-compose.prod.yml)
"${compose[@]}" config --quiet
"${compose[@]}" pull "${services[@]}"
# Bootstrap is separate: routine app updates never restart the other services.
"${compose[@]}" up -d --no-deps --wait --wait-timeout 120 "${services[@]}"
mv "$candidate" "$state"
echo "Updated $service to $tag"
