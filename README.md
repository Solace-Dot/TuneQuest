# 🎵 TuneQuest - AI-Powered Music Learning Platform

A full-stack web application that uses AI (GEMINI) to generate personalized music practice plans, quizzes, and song learning tutorials. Tailored for music students of all levels.

---

## 🆕 Recently Added Features

### ✅ Account Management
- **Account Deletion**: Permanently delete user account with two-click confirmation (found in Settings → Danger Zone)
- **Profile Persistence**: Save user instrument, skill level, and learning goals to backend
- **Profile Sync**: Profile data syncs across app pages and persists on login

### ✅ Authentication Improvements  
- **Error Handling**: Descriptive error messages for login failures
  - "This account doesn't exist. Sign up to create one." - for deleted accounts
  - "Incorrect password. Please try again." - for wrong password
- **Error Toasts**: User-friendly toast notifications instead of console errors
- **Loading States**: "Signing in..." button feedback during authentication

### ✅ Data Privacy & Cleanup
- **Complete Logout**: All user Redux state, localStorage, and sessionStorage cleared on logout
- **Account Deletion**: Complete data wipe - no residual data from deleted accounts
- **Fresh Login**: New users see completely clean state, no data leakage from previous accounts

### ✅ API Error Handling
- **200 Response for Missing Plans**: `/api/exercises/plans/today/` returns 200 with empty data instead of 404
- **200 Response for Login Errors**: Login endpoint returns 200 with error message instead of 400
- **No Console Errors**: Clean console on new account creation - no 404 or 400 spam
- **Graceful Degradation**: App handles missing plans and invalid credentials gracefully

---

## 📖 Overview

TuneQuest leverages AI to create a truly personalized music learning experience. Instead of static lessons, the platform generates:
- **Daily Practice Plans** - AI adapts to user's instrument, skill level, and goals
- **Dynamic Quizzes** - AI creates music theory and technique questions on-the-fly
- **Song Tutorials** - AI generates step-by-step guides for learning songs

The platform tracks progress, manages tokens, and provides analytics to help users improve.

---

## 🎯 Key Features

### 🤖 AI-Powered
- Claude AI integration for quiz and lesson generation
- Function calling for structured responses
- Token-based AI usage limits (Free: 10/day, Premium: unlimited)

### 📚 Learning Paths
- Customizable practice plans
- Exercises organized by skill level and category
- Interactive lessons and theory content

### 📊 Progress Tracking
- Practice streak counter
- Exercise completion tracking
- Performance analytics dashboard
- Time spent tracking

### 🎮 Interactive Practice
- Song learning with visual timelines
- Real-time quiz feedback
- Audio playback for songs
- Music notation support

### 👤 User Management
- Profile customization (instrument, skill level, goals)
- Account deletion with data cleanup
- Free and Premium subscriptions
- Subscription management

---

## 🏗️ Architecture

```
TuneQuestMain/
├── TuneQuest_Backend/          # Django REST API
│   ├── accounts/               # User auth & profiles
│   ├── ai_utils/               # Claude AI integrations
│   ├── exercises/              # Practice plans & exercises
│   ├── learn/                  # Lesson content
│   ├── payments/               # Subscription handling (stub)
│   ├── progress/               # Practice tracking
│   ├── quizzes/                # Quiz models
│   └── config/                 # Django settings
│
├── TuneQuest_Frontend/         # React app
│   ├── src/
│   │   ├── screens/            # Page components
│   │   ├── components/         # Reusable UI
│   │   ├── redux/              # State management
│   │   ├── services/           # API calls
│   │   └── styles/             # CSS modules
│   └── public/
│
└── README.md (this file)
```

---

## 🔧 Tech Stack

### Backend
- **Framework**: Django 5.x
- **API**: Django REST Framework
- **Database**: SQLite (dev), PostgreSQL (prod-ready)
- **Auth**: JWT via djangorestframework-simplejwt
- **AI**: Anthropic Claude API
- **Other**: pytz, rest_framework

### Frontend
- **Framework**: React 18.x
- **State**: Redux Toolkit
- **Routing**: React Router v6
- **UI**: React Bootstrap + CSS Modules
- **Animations**: Framer Motion
- **HTTP**: Axios

---

## 📦 Installation & Setup

### Backend Setup
```bash
cd TuneQuest_Backend

# Activate virtual environment
.venv\Scripts\activate          # Windows (PowerShell)
source .venv/bin/activate       # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

Backend runs at `http://localhost:8000`

See [Backend README](TuneQuest_Backend/README.md) for complete API documentation.

### Frontend Setup
```bash
cd TuneQuest_Frontend

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:8000" > .env

# Start dev server
npm start
```

Frontend runs at `http://localhost:3000`

See [Frontend README](TuneQuest_Frontend/README.md) for page structure and development guide.

---

## 🚀 Quick Start

1. **Backend first** (in separate terminal):
   ```bash
   cd TuneQuest_Backend
   .venv\Scripts\activate
   python manage.py migrate
   python manage.py runserver
   ```

2. **Frontend** (in new terminal):
   ```bash
   cd TuneQuest_Frontend
   npm install
   npm start
   ```

3. **Access** at `http://localhost:3000`

4. **Demo Account**: Use credentials shown on login page, or create new account

---

## 📱 Main Pages

### Public Pages
- **LandingPage** (`/`) - Welcome screen
- **LoginPage** (`/login`) - Authentication
- **RegisterPage** (`/register`) - Sign up
- **ForgotPasswordPage** (`/forgot`) - Password recovery

### Authenticated Pages
- **DashboardPage** (`/dashboard`) - Main hub
- **ProfilePage** (`/profile`) - User preferences
- **PracticePlanPage** (`/plan`) - Daily exercises
- **ExercisesPage** (`/exercises`) - Exercise library
- **QuizPage** (`/quiz`) - Quiz interface
- **SongPage** (`/game/song`) - Song learning
- **LearnPage** (`/learn`) - Lessons
- **ProgressPage** (`/progress`) - Analytics (premium)
- **SubscriptionPage** (`/subscribe`) - Upgrade plan
- **SettingsPage** (`/settings`) - App configuration

---

## 🔐 Authentication

- **JWT Tokens** with refresh mechanism
- **Token Refresh** at midnight PT for daily token resets
- **Automatic Logout** on token expiry
- **Protected Routes** prevent unauthorized access

---

## 🎵 AI Features

### Quiz Generation
```
User → describe topic → Claude generates quiz → store locally → take quiz
```

### Practice Plan Generation
```
User input (instrument, level, goals) → Claude creates plan → store in DB → display exercises
```

### Song Learning
```
Song title + skill level → AI generates tutorial → note sequences + timeline → interactive playback
```

---

## 💳 Subscription System

- **Free Plan**: 10 AI tokens/day, access to basic features
- **Premium Plan**: Unlimited tokens, advanced analytics, priority support

Token usage:
- Generate quiz: 1 token
- Generate practice plan: 2 tokens
- Generate song: 1 token

---

## 🧪 Testing

### Backend Tests
```bash
python manage.py test
```

### Frontend Tests
```bash
npm test
```

---

## 📚 API Documentation

Full API routes and examples available in [Backend README](TuneQuest_Backend/README.md).

Quick reference:
- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/profile`
- **Quizzes**: `/api/ai/quiz/generate`, `/api/ai/quiz/create`, `/api/ai/quiz/list`
- **Plans**: `/api/exercises/plans/generate`, `/api/exercises/plans/today`
- **Songs**: `/api/ai/generate-song-timeline`
- **Progress**: `/api/ai/progress/detailed-summary`

---

## 🎨 UI/UX Features

- **Dark/Light Theme Toggle** - Persistent theme selection
- **Animated Backgrounds** - Configurable visual effects
- **Responsive Design** - Works on all screen sizes
- **Toast Notifications** - Non-intrusive error/success messages
- **Loading States** - Visual feedback for async operations
- **Accessibility** - WCAG compliance in progress

---

## 🐛 Known Issues & TODOs

- [ ] Email-based password recovery (placeholder only)
- [ ] Proper full payment integration for Premium
- [ ] Advanced analytics for Premium users
- [ ] Music notation rendering
- [ ] Audio synthesis for quiz/song playback
- [ ] Real-time multiplayer features
- [ ] Mobile app version

---

## 🤝 Contributing

1. Feature branches: `feature/feature-name`
2. Bug fixes: `bugfix/bug-description`
3. Pull requests with clear descriptions
4. Test thoroughly before submitting

---

## 📞 Support & Contact

For issues, questions, or feature requests:
- Check relevant README files
- Review API documentation
- Contact development team

---

## 📄 File Structure Reference

```
TuneQuestMain/
├── TuneQuest_Backend/
│   ├── README.md                    ← Backend API docs
│   ├── manage.py
│   ├── requirements.txt
│   ├── db.sqlite3
│   ├── config/                      # Django config
│   ├── accounts/                    # Auth & profiles
│   ├── ai_utils/                    # Claude AI
│   ├── exercises/                   # Practice plans
│   ├── learn/                       # Lessons
│   └── [other apps...]
│
├── TuneQuest_Frontend/
│   ├── README.md                    ← Frontend dev guide
│   ├── package.json
│   ├── public/
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── redux/
│   │   ├── services/
│   │   └── styles/
│   └── .env
│
└── README.md                        ← You are here
```

---

## 📈 Project Status

**Current Version**: 0.2.0  
**Last Updated**: March 13, 2026  
**Status**: Active Development

Recent Updates:
- ✅ Complete account deletion with data cleanup
- ✅ Profile saving to backend
- ✅ Improved login error messages
- ✅ No console 400/404 errors for authentication or missing plans
- ✅ Data isolation between accounts on logout/login

---

**Happy Learning! 🎸🎹🎤**
