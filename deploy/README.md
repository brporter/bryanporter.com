# Deploying bryanporter.com to shell.betaporter.dev

`bryanporter.com` moves off GitHub Pages to a container (`bryanporter`) on the VM,
behind the shared Caddy edge. The Jekyll site is built and served by nginx from a
multi-stage image, following the Phosphor / OneBigHead GHCR + Watchtower pattern.

## Image build (automatic, in CI)

The site source lives on the **`main`** branch. Content updates land via PRs; when
a PR merges to `main`, the workflow `.github/workflows/deploy.yml` runs `Dockerfile`
(stage 1 `jekyll build`, stage 2 nginx) and pushes `ghcr.io/brporter/bryanporter:latest`
+ `:<sha>`. Watchtower on the VM redeploys within ~5 min.

**One-time:** after the first CI push, make the GHCR package
`ghcr.io/brporter/bryanporter` **public** so the VM can pull anonymously.

## First-time VM setup (run on shell.betaporter.dev)

```sh
sudo mkdir -p /opt/bryanporter
sudo rsync -a deploy/vm/  /opt/bryanporter/       # or scp deploy/vm/docker-compose.yml there
cd /opt/bryanporter && sudo docker compose up -d  # pulls ghcr.io/brporter/bryanporter:latest
```

The Caddy site block for `bryanporter.com` (in `shared-infra/Caddyfile`) sends `/*`
here and `/ragbrai/*` to the separate `ragbrai` container. Reload Caddy after copying
the updated Caddyfile to `/opt/shared` (see the RAGBRAI deploy README).

## Ongoing updates

Edit the site on a branch, open a PR, and merge to `main`. CI rebuilds the image;
Watchtower redeploys. No manual VM steps.

## DNS

Point `bryanporter.com` apex **A** record → `52.159.112.202` (`shell.betaporter.dev`)
and `www` → `shell.betaporter.dev`, replacing the GitHub Pages A records
(185.199.108–111.153). Caddy auto-issues TLS. Then disable GitHub Pages on this repo.
Full cutover checklist is in `photo-story/deploy/README.md`.
