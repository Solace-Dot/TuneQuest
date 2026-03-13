# 🏗️ TuneQuest Development & Deployment Guide

## Quick Start (5 minutes)

### Backend

```bash
cd TuneQuest_Backend
python -m venv .venv
.venv\Scripts\Activate.ps1      # Windows
source .venv/bin/activate        # macOS/Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd TuneQuest_Frontend
npm install
npm start
```

---

## PayPal Setup

### Step 1: Get PayPal Credentials

1. Go to https://developer.paypal.com/signin/
2. Sign in or create account
3. Click "Apps & Credentials" → "Sandbox" tab
4. Under "REST API apps", click "Create App"
5. Copy **Client ID** and **Secret**

### Step 2: Update .env

```env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=YOUR_CLIENT_ID_HERE
PAYPAL_SECRET=YOUR_SECRET_HERE
PAYPAL_CURRENCY=USD
PAYPAL_PREMIUM_PRICE=9.99
```

### Step 3: Test PayPal Checkout

1. Start both servers (backend + frontend)
2. Login at http://localhost:3000
3. Go to Subscription page
4. Click "Upgrade to Premium"
5. Use PayPal sandbox buyer account to test payment

**Sandbox Test Accounts:**
- Email: sb-buyer@business.example.com
- Password: (from PayPal dashboard)

---

## Environment Variables Reference

### Required

```env
DJANGO_SECRET_KEY=your-secret-key
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_SECRET=your-secret
```

### Optional (with defaults)

```env
DJANGO_DEBUG=true
PAYPAL_MODE=sandbox          # sandbox or live
PAYPAL_CURRENCY=USD
PAYPAL_PREMIUM_PRICE=9.99
PAYPAL_MOCK_MODE=false       # Enable mock payment mode
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## Production Deployment

### Backend (Heroku Example)

```bash
# Install Heroku CLI
heroku login
heroku create tunequest-api

# Set environment variables
heroku config:set DJANGO_SECRET_KEY=...
heroku config:set PAYPAL_MODE=live
heroku config:set PAYPAL_CLIENT_ID=...
heroku config:set PAYPAL_SECRET=...

# Deploy
git push heroku main
```

### Frontend (Vercel Example)

```bash
cd TuneQuest_Frontend
npm install -g vercel
vercel
# Set REACT_APP_API_BASE_URL to production backend URL
```

---

## Troubleshooting

### PayPal "Unauthorized" Error
- Verify CLIENT_ID and SECRET in .env
- Ensure PAYPAL_MODE matches credential type (sandbox vs live)
- Check PayPal app permissions

### CORS Errors
Update `CORS_ALLOWED_ORIGINS` in settings.py

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti :8000 | xargs kill -9
```

---

## Testing PayPal Without Real API

Enable mock mode in .env:
```env
PAYPAL_MOCK_MODE=true
```

Frontend will show "Simulate Payment" instead of PayPal button.

---

## Database Management

### Reset Database
```bash
rm TuneQuest_Backend/db.sqlite3
cd TuneQuest_Backend
python manage.py migrate
```

### Create Superuser
```bash
python manage.py createsuperuser
# Access: http://localhost:8000/admin/
```

### View Payments
```bash
python manage.py shell
>>> from payments.models import Payment
>>> Payment.objects.all()
```

---

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: 3.11
      - run: pip install -r TuneQuest_Backend/requirements.txt
      - run: ./TuneQuest_Backend/manage.py test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 16
      - run: cd TuneQuest_Frontend && npm ci && npm run build
```

---

## Performance Tips

1. **Frontend**: Use `npm run build` for production bundles
2. **Backend**: Use PostgreSQL instead of SQLite
3. **Cache**: Enable Redis for token caching
4. **CDN**: Serve static files from CloudFront/CloudFlare
5. **PayPal**: Reduce API calls with caching

---

## Security Checklist

- [ ] Generate strong `DJANGO_SECRET_KEY`
- [ ] Set `DJANGO_DEBUG=false` in production
- [ ] Use HTTPS (redirect HTTP)
- [ ] Enable CSRF protection
- [ ] Add rate limiting to PayPal endpoints
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Enable SQL injection protection (Django default)
