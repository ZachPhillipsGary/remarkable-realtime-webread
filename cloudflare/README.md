# Cloudflare Workers Deployment

This directory contains the Cloudflare Workers version of the reMarkable Real-time Canvas server using Durable Objects for WebSocket state management.

## Features

- **Global Edge Network**: Deploy your canvas server to Cloudflare's edge network
- **WebSocket Support**: Real-time bidirectional communication
- **Durable Objects**: Persistent state management across connections
- **Auto-scaling**: Handles any number of concurrent connections
- **Zero Configuration**: No servers to manage

## Prerequisites

- Cloudflare account (free tier works!)
- Node.js 16+ installed
- Wrangler CLI (will be installed automatically)

## Quick Start

### Option 1: Automated Deployment

```bash
# Run the deployment script
./deploy.sh
```

The script will:
1. Check for Wrangler CLI and install if needed
2. Authenticate with Cloudflare
3. Deploy your worker
4. Show you the deployment URL

### Option 2: Manual Deployment

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
cd cloudflare
npm install
wrangler deploy
```

## Configuration

### Basic Configuration

Edit `wrangler.toml` to customize:

```toml
name = "remarkable-canvas"  # Your worker name
account_id = "your-account-id"  # Optional: set via wrangler login
```

### Custom Domain

To use a custom domain instead of `*.workers.dev`:

1. Add your domain to Cloudflare
2. Update `wrangler.toml`:

```toml
routes = [
  { pattern = "canvas.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

3. Redeploy: `wrangler deploy`

## Environment Variables

Set these in the Cloudflare dashboard or via `wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "production"
MAX_HISTORY = "1000"
```

## Monitoring

### View Logs

```bash
# Stream live logs
wrangler tail

# Or in the dashboard
# https://dash.cloudflare.com -> Workers -> remarkable-canvas -> Logs
```

### Analytics

View analytics in the Cloudflare dashboard:
- Request count
- CPU time
- Error rate
- Active connections

## Cost

Cloudflare Workers pricing (as of 2024):

- **Free tier**: 100,000 requests/day
- **Paid**: $5/month for 10 million requests
- **Durable Objects**: $0.15 per million requests

For typical usage with 10 users drawing for an hour:
- Estimated cost: **$0** (within free tier)

## Troubleshooting

### Authentication Issues

```bash
# Re-authenticate
wrangler logout
wrangler login
```

### Deployment Fails

```bash
# Check account ID
wrangler whoami

# Verify wrangler.toml
wrangler publish --dry-run
```

### WebSocket Connection Issues

1. Check CORS settings
2. Verify the worker is deployed: visit `https://your-worker.workers.dev/health`
3. Check browser console for errors
4. Verify WebSocket upgrade headers

### Durable Objects Not Working

Ensure migrations are applied:

```bash
# List migrations
wrangler deployments list

# Force migration
wrangler deploy --new-class CanvasRoom
```

## Architecture

```
┌─────────────┐
│   Client    │
│ (Browser or │
│ reMarkable) │
└──────┬──────┘
       │
       │ WebSocket
       │
       ▼
┌─────────────────────┐
│ Cloudflare Worker   │
│ (Edge Network)      │
└──────┬──────────────┘
       │
       │ Binding
       │
       ▼
┌─────────────────────┐
│  Durable Object     │
│  (CanvasRoom)       │
│  - WebSocket state  │
│  - Canvas history   │
│  - Client sessions  │
└─────────────────────┘
```

## API Endpoints

- `GET /` - Web client interface
- `GET /client.js` - Client JavaScript
- `GET /health` - Health check endpoint
- `WebSocket /` - WebSocket connection

## Development

### Local Development

```bash
# Run local dev server
wrangler dev

# Access at http://localhost:8787
```

### Testing

```bash
# Test WebSocket connection
wscat -c ws://localhost:8787

# Send test message
{"type":"stroke","points":[[10,10],[20,20]],"color":"#000000","width":2}
```

## Production Checklist

- [ ] Set up custom domain (optional)
- [ ] Configure environment variables
- [ ] Set up monitoring/alerts
- [ ] Test WebSocket connections
- [ ] Update CORS settings if needed
- [ ] Document your worker URL
- [ ] Set up CI/CD (GitHub Actions included)

## GitHub Actions Integration

Automatic deployment on push to main:

1. Add secrets to GitHub repository:
   - `CLOUDFLARE_API_TOKEN`: Create at https://dash.cloudflare.com/profile/api-tokens
   - `CLOUDFLARE_ACCOUNT_ID`: Found in Workers dashboard

2. Push to main branch triggers deployment

3. View deployment status in Actions tab

## Migration from Node.js Server

If you're migrating from the Node.js server:

1. Deploy the Cloudflare Worker
2. Update reMarkable client to use new URL:
   ```bash
   ./remarkable-canvas -s wss://your-worker.workers.dev
   ```
3. Update any web clients to point to new URL
4. Shut down old Node.js server

## Limitations

- **Connection Limits**: Durable Objects support ~10,000 concurrent WebSocket connections
- **State Storage**: Limited to 128 KB per Durable Object
- **CPU Time**: 50ms per request (usually enough for canvas operations)

## Advanced Configuration

### Multiple Canvas Rooms

Modify `worker.js` to support room IDs:

```javascript
const roomId = url.searchParams.get('room') || 'default';
const id = env.CANVAS_ROOM.idFromName(roomId);
```

### Authentication

Add authentication middleware:

```javascript
if (!request.headers.get('Authorization')) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Rate Limiting

Implement rate limiting per client:

```javascript
// In CanvasRoom class
if (this.messageCount[clientId] > MAX_MESSAGES_PER_MINUTE) {
  return; // Drop message
}
```

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/workers/learning/using-durable-objects/)
- [WebSocket API](https://developers.cloudflare.com/workers/runtime-apis/websockets/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## Support

For issues specific to Cloudflare deployment:
1. Check Cloudflare status: https://www.cloudflarestatus.com/
2. Review worker logs: `wrangler tail`
3. Open an issue in this repository
4. Consult Cloudflare community: https://community.cloudflare.com/
