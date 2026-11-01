#!/usr/bin/env bash
# Exercise deployment boundaries without Docker, SSH, or a running VPS.
set -euo pipefail
script_dir=$(cd "$(dirname "$0")" && pwd)
fixture=$(mktemp -d)
cleanup() {
  rm -f "$fixture/bin/docker" "$fixture/.env" "$fixture/docker-compose.prod.yml" \
    "$fixture/.image-tags.env" "$fixture/.deploy.lock" "$fixture/log" "$fixture/before"
  rmdir "$fixture/bin" "$fixture"
}
trap cleanup EXIT
# Git Bash on Windows lacks flock; the fixture only exercises deployment commands/state.
if ! command -v flock >/dev/null; then flock() { :; }; export -f flock; fi
mkdir "$fixture/bin"
cat > "$fixture/bin/docker" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$DEPLOY_TEST_LOG"
if [[ "${DEPLOY_TEST_FAIL:-}" == yes && "$*" == *" pull "* ]]; then exit 1; fi
MOCK
chmod +x "$fixture/bin/docker"
export PATH="$fixture/bin:$PATH"
export DEPLOY_TEST_LOG="$fixture/log"
cd "$fixture"
touch .env docker-compose.prod.yml
printf 'ADMIN_IMAGE_TAG=admin-old\nEDGE_IMAGE_TAG=edge-old\n' > .image-tags.env
bash "$script_dir/update-service.sh" web web-new 20
grep -qx 'WEB_IMAGE_TAG=web-new' .image-tags.env
grep -qx 'BACK_IMAGE_TAG=web-new' .image-tags.env
grep -qx 'ADMIN_IMAGE_TAG=admin-old' .image-tags.env
grep -q 'pull back web$' log
grep -q 'up -d --no-deps --wait --wait-timeout 120 back web$' log
bash "$script_dir/update-service.sh" admin admin-new 21
grep -qx 'ADMIN_IMAGE_TAG=admin-new' .image-tags.env
grep -qx 'WEB_IMAGE_TAG=web-new' .image-tags.env
grep -q 'pull back admin$' log
grep -qx 'BACK_IMAGE_TAG=admin-new' .image-tags.env
bash "$script_dir/update-service.sh" edge edge-new 30
# An older frontend may still update, but cannot downgrade the newer shared API.
bash "$script_dir/update-service.sh" web web-only 20
grep -qx 'WEB_IMAGE_TAG=web-only' .image-tags.env
grep -qx 'BACK_IMAGE_TAG=admin-new' .image-tags.env
cp .image-tags.env before
bash "$script_dir/update-service.sh" web stale 19
cmp before .image-tags.env
export DEPLOY_TEST_FAIL=yes
if bash "$script_dir/update-service.sh" web broken 22; then echo "Expected pull failure" >&2; exit 1; fi
cmp before .image-tags.env
unset DEPLOY_TEST_FAIL
if bash "$script_dir/update-service.sh" unknown bad; then echo "Expected component rejection" >&2; exit 1; fi
if bash "$script_dir/update-service.sh" web 'bad/tag'; then echo "Expected tag rejection" >&2; exit 1; fi
echo "Deployment updater checks passed"
