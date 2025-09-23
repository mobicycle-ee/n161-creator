# N161 Appeal Creator AI

AI-powered Cloudflare Worker that generates N161 Court of Appeal documents through an interactive chat interface.

## Features

- **Interactive AI Chat**: Natural conversation to gather appeal details
- **Automatic Document Generation**: Creates complete appeal documentation:
  - N161 Notice of Appeal form
  - Grounds of Appeal
  - Skeleton Argument  
  - Evidence List
  - Witness Statements

## Setup

### Prerequisites
- Cloudflare account
- GitHub account
- Bun installed locally

### Local Development

```bash
# Install dependencies
bun install

# Run locally
bunx wrangler dev
```

### Deployment

1. Get your Cloudflare API token and account ID from the Cloudflare dashboard

2. Add GitHub secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

3. Push to GitHub - will auto-deploy via GitHub Actions

### KV Namespaces

Create these KV namespaces in Cloudflare:
- `ORDERS` - Stores court orders
- `APPEALS` - Stores appeal sessions and documents

Update the IDs in `wrangler.toml` with your actual namespace IDs.

## Tech Stack

- Cloudflare Workers with AI
- Hono framework
- TypeScript
- Tailwind CSS (CDN)
- Workers KV for storage