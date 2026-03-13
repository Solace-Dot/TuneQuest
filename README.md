# 🎵 TuneQuest - AI-Powered Music Learning Platform

A full-stack web application built with **Django** + **React** that provides personalized music practice plans, interactive lessons, and real-time feedback powered by AI.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [PayPal Integration](#paypal-integration)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)

---

## ✨ Features

### 🎸 Core Music Features
- **High-precision Metronome** - Lookahead scheduler with woodblock & monolith sound profiles
- **Interactive Song Manager** - Timeline-based practice with real-time feedback
- **AI Practice Plans** - Personalized learning paths adapted to skill level & goals
- **Dynamic Quizzes** - AI-generated theory quizzes with progress tracking
- **Learn Module** - 50+ music theory lessons with interactive examples

### 💎 Premium Features (PayPal)
- Unlimited AI plan regeneration
- Detailed progress summaries
- Ad-free experience
- Priority support

### 👥 User Management
- JWT-based authentication with midnight PT token refresh
- User profiles with instrument & skill tracking
- Subscription management
- Account deletion & data export

### 🎨 UI/UX
- Theme support (light/dark mode)
- Animated backgrounds
- Responsive design (mobile-first)
- Floating AI chat assistant

---

## 🛠️ Tech Stack

### Backend
- **Django 5.x** with Django REST Framework
- **SQLite** (development) / PostgreSQL (production)
- **PayPal REST API** integration
- **JWT** authentication (simplejwt)
- **Celery** (optional, for async tasks)

### Frontend
- **React 18** with React Router v6
- **Redux** state management
- **Framer Motion** for animations
- **PayPal React SDK**
- **Bootstrap 5** styling
- **Axios** HTTP client

---

## 📂 Project Structure

```
TuneQuestMain/
├── TuneQuest_Backend/
│   ├── config/              # Django settings & URLs
│   ├── accounts/            # User auth & profiles
│   ├── ai_utils/            # AI plan/quiz generation
│   ├── exercises/           # Practice exercises
│   ├── learn/               # Music theory lessons
│   ├── payments/            # PayPal integration
│   ├── progress/            # User progress tracking
│   ├── quizzes/             # Quiz management
│   ├── manage.py
│   └── requirements.txt
│
├── TuneQuest_Frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/             # API client & endpoints
│   │   ├── components/      # Reusable React components
│   │   ├── context/         # React context (deprecated, use Redux)
│   │   ├── hooks/           # Custom hooks (useMetronome, etc)
│   │   ├── redux/           # State management slices
│   │   ├── screens/         # Page components
│   │   ├── services/        # Business logic (tokenRefresher, etc)
│   │   ├── styles/          # CSS modules
│   │   ├── backgrounds/     # Animated backgrounds
│   │   └── App.js
│   └── package.json
│
├── .env.example             # Environment template
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Backend

```bash
cd TuneQuest_Backend
python -m venv .venv
.venv\Scripts\Activate.ps1        # Windows
source .venv/bin/activate          # macOS/Linux
pip install -r requirements.txt
cp ../.env.example ../.env
# Edit .env with your PayPal credentials
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd TuneQuest_Frontend
npm install
npm start
```

Visit `http://localhost:3000` → Backend at `http://localhost:8000`

---

## 🔐 Environment Setup

### 1. Create `.env` File

Copy `.env.example` to project root:

```bash
cp .env.example .env
```

### 2. Configure PayPal

Get credentials from https://developer.paypal.com:

```env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_SECRET=your-secret
PAYPAL_CURRENCY=USD
PAYPAL_PREMIUM_PRICE=9.99
```

### 3. Set Django Secret

Generate a strong secret key:

```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

Add to `.env`:
```env
DJANGO_SECRET_KEY=your-generated-key
```

---

## 💳 PayPal Integration

### Backend Entry Points

Located in `TuneQuest_Backend/payments/`:

```
POST   /api/payments/paypal/config/              # Get PayPal config
POST   /api/payments/paypal/orders/              # Create payment order
POST   /api/payments/paypal/orders/<id>/capture/ # Capture payment
```

### Frontend Component

`TuneQuest_Frontend/src/screens/SubscriptionPage.jsx`:
- Plan comparison (Free vs Premium)
- PayPal checkout button
- Mock payment mode (for testing)
- Payment status handling

### Testing PayPal

Set `PAYPAL_MODE=sandbox` in `.env` and use PayPal sandbox credentials.

For local testing without PayPal API, enable mock mode:
```env
PAYPAL_MOCK_MODE=true
```

---

## 📡 Key API Endpoints

### Authentication

```
POST   /api/auth/register/             # Register new user
POST   /api/auth/login/                # User login
POST   /api/auth/token/refresh/        # Refresh JWT token
GET    /api/auth/profile/              # Get user profile
PUT    /api/auth/profile/              # Update profile
DELETE /api/auth/profile/              # Delete account
```

### AI & Learning

```
POST   /api/ai/generate-practice-plan/ # Generate personalized plan
GET    /api/ai/tokens/                 # Check AI token balance
GET    /api/learn/lessons/             # List all lessons
POST   /api/learn/lessons/<slug>/toggle/ # Mark lesson complete
```

### Payments

```
GET    /api/payments/paypal/config/    # Get PayPal client ID
POST   /api/payments/paypal/orders/    # Create payment order
POST   /api/payments/paypal/orders/<id>/capture/ # Capture completed payment
```

---

## 🏗️ Development

### Running Both Servers

**Terminal 1 (Backend):**
```bash
cd TuneQuest_Backend
source .venv/bin/activate
python manage.py runserver
```

**Terminal 2 (Frontend):**
```bash
cd TuneQuest_Frontend
npm start
```

### Django Admin

Create superuser:
```bash
python manage.py createsuperuser
```

Access at: `http://localhost:8000/admin/`

### Database Reset

```bash
rm db.sqlite3
python manage.py migrate
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Update `CORS_ALLOWED_ORIGINS` in `.env` |
| PayPal "unauthorized" | Check `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET` |
| Token refresh fails | Clear browser cookies, login again |
| Port already in use | Kill process: `lsof -ti :8000 \| xargs kill` |

---

## 📦 Deployment

### Production Checklist

- [ ] Set `DJANGO_DEBUG=false`
- [ ] Generate strong `DJANGO_SECRET_KEY`
- [ ] Set `PAYPAL_MODE=live` with live credentials
- [ ] Update `ALLOWED_HOSTS` with domain
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable HTTPS (redirect HTTP)
- [ ] Set up email backend for notifications

### Docker Deploy

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## 📚 Learn More

- [Django Docs](https://docs.djangoproject.com/)
- [React Docs](https://react.dev/)
- [PayPal Developer](https://developer.paypal.com/docs/)
- [JWT Auth](https://django-rest-framework-simplejwt.readthedocs.io/)

---

## 📄 License

MIT - See LICENSE file

---

## 👨‍💻 Contributors

Built by the TuneQuest team. Contributions welcome!
