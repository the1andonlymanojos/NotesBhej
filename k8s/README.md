# Kubernetes deployment

The Next.js container listens on port `3000`. The Service exposes it on
NodePort `30000`, because standard Kubernetes NodePorts cannot use port `3000`.
For a host-installed Cloudflare Tunnel, use `http://127.0.0.1:30000` as the
origin service after applying these manifests.

Build the image with the public values that Next.js must embed in browser code:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_API_BASE_URL="https://notesbhej.mshiv.net" \
  --build-arg NEXT_PUBLIC_SITE_URL="https://notesbhej.mshiv.net" \
  --build-arg API_SERVER_BASE_URL="http://127.0.0.1:30080" \
  -t docker.io/manojthedonut/notesbhej:latest .
```

Push the image, then create the uncommitted secret from
`secret.example.yaml` and apply the bundle:

```bash
kubectl apply -f /path/to/notesbhej-secrets.yaml
kubectl apply -k k8s
kubectl -n notesbhej rollout status deployment/notesbhej
curl http://127.0.0.1:30000/
```

`API_SERVER_BASE_URL` targets the deployed backend Service at
`http://notesbhej-api:8080` in the same namespace. The backend's NodePort
`30080` remains useful only for host-installed tooling and external debugging;
pods should use the Service DNS name.
