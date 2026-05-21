# Mapa do Cle

> PoC de um app de mapa do Clemente

## Development

This project uses pnpm. The pinned package-manager version is declared in `package.json`.

```sh
corepack enable
pnpm dev
```

The development server runs at `http://127.0.0.1:8000/`.

Use `PORT=8001 pnpm dev` if port 8000 is already in use.

## Deploy

This is a static site deployed by GitHub Actions to GitHub Pages.

First-time repository setup:

1. Go to **Settings > Pages** on GitHub.
2. Set **Build and deployment > Source** to **GitHub Actions**.
3. Push to `main`, or run the `Deploy static site to GitHub Pages` workflow manually.
