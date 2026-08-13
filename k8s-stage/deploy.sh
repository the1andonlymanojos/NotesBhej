#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.local}"
IMAGE="${IMAGE:-docker.io/manojthedonut/notesbhej:stage}"
STAGE_API="https://notesbhej-stage.mshiv.net"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

# Accept the legacy names currently used in some local env files.
R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID:-${R2_ACCESS_KEY:-${R2_ACESS_KEY_ID:-}}}"

required=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY R2_BUCKET_NAME R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_KEY)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing $name in $ENV_FILE" >&2
    exit 1
  fi
done

docker build --network=host \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_API_BASE_URL="$STAGE_API" \
  --build-arg NEXT_PUBLIC_SITE_URL="$STAGE_API" \
  --build-arg API_SERVER_BASE_URL="$STAGE_API" \
  -t "$IMAGE" .
docker push "$IMAGE"

kubectl apply -f k8s-stage/namespace.yaml
kubectl -n notesbhej-stage create secret generic notesbhej-stage-secrets \
  --from-literal=NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --from-literal=NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  --from-literal=R2_BUCKET_NAME="$R2_BUCKET_NAME" \
  --from-literal=R2_ACCOUNT_ID="$R2_ACCOUNT_ID" \
  --from-literal=R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  --from-literal=R2_SECRET_KEY="$R2_SECRET_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -k k8s-stage
kubectl -n notesbhej-stage rollout status deployment/notesbhej-stage

echo "Stage frontend: http://127.0.0.1:31000"
echo "Stage API:      $STAGE_API"
