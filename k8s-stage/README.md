# Stage deployment

Stage uses namespace `notesbhej-stage` and frontend NodePort `31000`.
The tunnel should target `http://localhost:31000`.

The frontend talks to the stage backend at:

```text
https://notesbhej-stage.mshiv.net
```

Inside Kubernetes, server-side requests use:

```text
http://notesbhej-api-stage.notesbhej-stage.svc.cluster.local:8080
```

Build and push the stage image:

```bash
set -a; source .env.local; set +a
docker build --network=host \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_API_BASE_URL="https://notesbhej-stage.mshiv.net" \
  --build-arg NEXT_PUBLIC_SITE_URL="https://notesbhej-stage.mshiv.net" \
  --build-arg API_SERVER_BASE_URL="https://notesbhej-stage.mshiv.net" \
  -t docker.io/manojthedonut/notesbhej:stage .
docker push docker.io/manojthedonut/notesbhej:stage
```

Deploy everything, reusing the secrets already in `.env.local`:

```bash
bash k8s-stage/deploy.sh
```

The GitHub Actions workflow in `.github/workflows/stage.yml` performs the same
flow automatically for pushes to the `stage` branch. Its build/deploy job must
run on a runner with labels:

```text
self-hosted, linux, notesbhej-stage, frontend
```

Configure these GitHub Actions secrets in the `stage` environment:
`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_BUCKET_NAME`,
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_KEY`.

The script creates/updates the Kubernetes Secret from `.env.local`; it does
not copy the production API URL into the stage Secret. The generated Secret is
ignored by Git.

The backend's host NodePort is `http://127.0.0.1:30008`; frontend pods should
use the Service DNS configured in `configmap.yaml` instead.
