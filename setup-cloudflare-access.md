# Cloudflare Access Setup for N161 Creator

## Step 1: Access Cloudflare Zero Trust Dashboard

1. Go to: https://dash.cloudflare.com
2. Select your account: `mobicycle`
3. Navigate to: **Zero Trust** → **Access** → **Applications**

## Step 2: Create Application

Click **"Add an application"** and configure:

### Application Details
- **Type**: Self-hosted
- **Name**: `N161 Creator`
- **Application domain**: `n161-creator.mobicycle.workers.dev`
- **Session Duration**: `24 hours`

### Advanced Settings
- **Enable App in App Launcher**: ✅ Yes
- **Skip Cloudflare Gateway connection**: ❌ No
- **Disable Cloudflare analytics**: ❌ No

## Step 3: Configure Authentication Policy

### Policy Details
- **Policy Name**: `Authorized Users`
- **Action**: `Allow`

### Include Rules
Add rule type: **Emails**
- Enter your email: `[YOUR_EMAIL_HERE]`

### Authentication Methods
Enable: **One-time PIN**
- Users will receive OTP via email
- No additional setup required

## Step 4: Application Settings

### Additional Settings
- **Identity Provider**: Cloudflare default (email OTP)
- **CORS Settings**: Allow all origins (for Worker API access)
- **Cookie Settings**: Secure, HttpOnly, SameSite=Lax

## Step 5: Save and Deploy

1. Click **"Save application"**
2. Cloudflare Access is now active
3. Test by visiting: `https://n161-creator.mobicycle.workers.dev`

## Expected User Flow

1. User visits N161 creator URL
2. Redirected to Cloudflare Access login
3. Enter email address
4. Receive OTP via email
5. Enter OTP code
6. Authenticated for 24 hours
7. Access granted to N161 creator

## Troubleshooting

- **Access denied**: Check email is in policy
- **No OTP received**: Check spam folder
- **Session expired**: Re-authenticate (24hr limit)

## API Alternative (if needed)

If you want to automate this, you can use the Cloudflare API:

```bash
# Get Zone ID
curl -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Create Access Application
curl -X POST "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/access/apps" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "N161 Creator",
    "domain": "n161-creator.mobicycle.workers.dev",
    "type": "self_hosted",
    "session_duration": "24h"
  }'
```

Would you like me to help with the manual setup or API configuration?