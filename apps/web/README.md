# Web App

This directory contains the Next.js public application for Explorers Map.

## Getting Started

From the repository root, run:

```bash
pnpm dev:web
```

Or, from inside this directory:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scope

- Public browsing UI
- App Router pages
- SEO metadata
- Read-only MVP presentation layer

## Shared Workspace Packages

This app is expected to consume shared packages from the repository workspace:

- `@explorers-map/db`
- `@explorers-map/services`
- `@explorers-map/utils`

Shared packages are transpiled through Next.js so they can be imported directly from the monorepo.

## Notes

- Keep public content reads aligned with the shared service and data-model rules in the root brief.
- Do not introduce write-specific business logic here that belongs in shared services or MCP tools.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
