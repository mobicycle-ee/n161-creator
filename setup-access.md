# Cloudflare Access Setup Instructions

## Quick Setup for Tablet Access

Your N161 Creator is now deployed at:
**https://n161-creator-production.mobicycle.workers.dev**

### Set up Cloudflare Access (One-Time Setup)

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com
   - Navigate to: Zero Trust → Access → Applications

2. **Create New Application**
   - Click "Add an application"
   - Select "Self-hosted"
   - Application name: "N161 Creator"
   - Session Duration: 24 hours
   - Application domain: `n161-creator-production.mobicycle.workers.dev`

3. **Configure Authentication**
   - Add Policy:
     - Name: "Authorized Users"
     - Action: Allow
     - Include → Emails: `roslyn@example.com` (replace with your email)
   - Authentication methods: Enable "One-time PIN"

4. **Save and Deploy**
   - Click "Save application"

### Access from Tablet

Once configured, navigate to:
**https://n161-creator-production.mobicycle.workers.dev**

1. You'll see Cloudflare Access login page
2. Enter your email address
3. Check email for one-time PIN
4. Enter PIN
5. Access granted for 24 hours

### For Mac Mini Tunnel (Optional - Desktop Access)

If you want to access local files from the worker:

```bash
# Install cloudflared
brew install cloudflared

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create n161-mac-mini

# Create config file
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: n161-mac-mini
credentials-file: /Users/mobicycle/.cloudflared/[tunnel-id].json

ingress:
  - hostname: orders.n161.local
    service: file:///Users/mobicycle/Library/Mobile\ Documents/com~apple~CloudDocs/0._Legal/Roman_House/orders_from_courts
  - service: http_status:404
EOF

# Run tunnel
cloudflared tunnel run n161-mac-mini
```

## Current Status

✅ Worker deployed at: https://n161-creator-production.mobicycle.workers.dev
⏳ Cloudflare Access: Needs dashboard configuration (see above)
⏳ Mac Mini Tunnel: Optional, for desktop use

## Test the Deployment

Once Access is configured, test with:
```bash
curl https://n161-creator-production.mobicycle.workers.dev/api/health
```

Or simply visit the URL in your tablet browser!