# N161 Creator Deployment Architecture

## 🌐 How It Works

### From Tablet (Web Access)
```
Tablet Browser
     ↓
[Cloudflare Access] ← Authentication (Email OTP)
     ↓
Cloudflare Worker (n161-creator.roslyn.workers.dev)
     ↓
Uses: Agents + Cloudflare AI (@cf/meta/llama-3.1-8b-instruct)
     ↓
Accesses: D1 Databases (6 Books)
```
- **Agents Only**: Yes, tablet uses agents via web API
- **Cloudflared**: No, direct HTTPS to worker
- **Security**: Cloudflare Access with email authentication

### From Desktop (Local + Cloud)
```
Desktop App
     ↓
[Option 1: Local Processing]
Mac Mini → Cloudflare Tunnel → Worker
     ↓
[Option 2: Direct Cloud]
HTTPS → Worker API
     ↓
Uses: Worker AI + Database Access
```
- **Worker Access to Mac Mini**: Via Cloudflare Tunnel (cloudflared)
- **AI Being Used**: @cf/meta/llama-3.1-8b-instruct (free tier)
- **Databases**: All 6 books in Cloudflare D1

## 🔒 Security Setup

### 1. Cloudflare Access Configuration
```yaml
# .cloudflare/access.yml
application: n161-creator
policies:
  - name: "Authorized Users"
    decision: allow
    include:
      - email: roslyn@example.com
    authentication:
      - method: email_otp  # One-time password via email
```

### 2. Cloudflare Tunnel (for Mac Mini)
```bash
# Install cloudflared on Mac Mini
brew install cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create n161-mac-mini

# Configure tunnel
cat > ~/.cloudflared/config.yml << EOF
tunnel: n161-mac-mini
credentials-file: /Users/mobicycle/.cloudflared/[tunnel-id].json

ingress:
  # Local document access
  - hostname: docs.n161.local
    service: http://localhost:8080
    originRequest:
      noTLSVerify: true
  
  # Orders folder access
  - hostname: orders.n161.local
    service: file:///Users/mobicycle/Library/Mobile\ Documents/com~apple~CloudDocs/0._Legal/Roman_House/orders_from_courts
  
  # Catch-all
  - service: http_status:404
EOF

# Run tunnel
cloudflared tunnel run n161-mac-mini
```

### 3. Worker Configuration
```typescript
// wrangler.toml
name = "n161-creator"
main = "src/index.ts"
compatibility_date = "2025-01-01"

# Cloudflare Access integration
[env.production]
account_id = "your-account-id"
route = "n161.roslyn.workers.dev/*"

# AI Model
[ai]
binding = "AI"

# D1 Databases
[[d1_databases]]
binding = "BOOK_0_DEMOCRACY"
database_name = "book_0_democracy_is_dead"
database_id = "9a09f8e0-c866-4660-9089-d4de2a81326f"

# ... other 5 books ...

# KV for agent training cache
[[kv_namespaces]]
binding = "AGENT_TRAINING"
id = "training-cache-kv-id"
```

## 🚀 Deployment Commands

```bash
# 1. Deploy the worker
bun run deploy
# or
wrangler deploy

# 2. Configure Access (via dashboard or CLI)
wrangler access create \
  --name "N161 Creator" \
  --domain n161.roslyn.workers.dev \
  --policy-email roslyn@example.com

# 3. Start Mac Mini tunnel (for local file access)
cloudflared tunnel run n161-mac-mini

# 4. Pre-train agents (run once after deploy)
curl -X POST https://n161.roslyn.workers.dev/api/admin/train \
  -H "Authorization: Bearer [admin-token]"
```

## 📱 Tablet Access

1. Navigate to: `https://n161.roslyn.workers.dev`
2. Cloudflare Access prompts for email
3. Enter: roslyn@example.com
4. Receive OTP via email
5. Enter OTP
6. Access granted for 24 hours

### Tablet UI
```html
<!-- Simple UI for tablet -->
<div class="tablet-ui">
  <h1>N161 Appeal Creator</h1>
  
  <button onclick="uploadOrder()">
    📄 Upload Order to Appeal
  </button>
  
  <button onclick="selectFromList()">
    📁 Select from Recent Orders
  </button>
  
  <div id="progress">
    <!-- Shows each agent working -->
  </div>
  
  <button onclick="downloadN161()">
    📥 Download Completed N161
  </button>
</div>
```

## 💻 Desktop Access

### Option 1: Via Cloudflare Worker
```javascript
// Desktop app calls worker API
const response = await fetch('https://n161.roslyn.workers.dev/api/appeal', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer [your-token]',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderPaths: [
      '/orders/2025.08.29 HHJ Gerald.pdf',
      '/orders/2025.09.03 HHJ Gerald.pdf'
    ]
  })
});
```

### Option 2: Direct Mac Mini Access
```javascript
// Desktop app accesses Mac Mini via tunnel
const orders = await fetch('https://orders.n161.local/list');
const selectedOrder = await fetch('https://orders.n161.local/read/2025.08.29.pdf');
```

## 🤖 AI Configuration

### Worker AI (Cloudflare)
```typescript
const response = await env.AI.run(
  '@cf/meta/llama-3.1-8b-instruct',
  {
    prompt: groundsPrompt,
    max_tokens: 2000,
    temperature: 0.7
  }
);
```

### Alternative: OpenAI (if needed)
```typescript
// For more complex analysis
const openai = new OpenAI({ 
  apiKey: env.OPENAI_API_KEY 
});

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'system', content: trainingData }]
});
```

## 📊 Performance

- **Agent Response**: ~2-3 seconds per section
- **Full N161 Generation**: ~30-45 seconds
- **Database Queries**: <100ms (D1 edge cached)
- **AI Inference**: 1-2 seconds per call

## 🌍 URLs

- **Production**: https://n161.roslyn.workers.dev
- **Staging**: https://n161-staging.roslyn.workers.dev
- **Mac Mini Tunnel**: https://docs.n161.local (via cloudflared)
- **Admin Panel**: https://n161.roslyn.workers.dev/admin

## 🔑 Security Summary

1. **Authentication**: Cloudflare Access (email OTP)
2. **Authorization**: Per-user access control
3. **Encryption**: All traffic over HTTPS
4. **Tunnel Security**: Cloudflare Tunnel (no exposed ports)
5. **API Keys**: Stored in Cloudflare secrets
6. **Rate Limiting**: 10 requests per minute
7. **CORS**: Restricted to approved domains

## 📋 Monitoring

```bash
# View worker logs
wrangler tail

# Check tunnel status
cloudflared tunnel info n161-mac-mini

# Monitor D1 queries
wrangler d1 execute book_0_democracy --command "SELECT COUNT(*) FROM chapter_titles"
```