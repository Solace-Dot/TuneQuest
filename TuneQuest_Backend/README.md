# TuneQuest Backend API

This is the backend service for the TuneQuest project, built with **Django** and **Django REST Framework (DRF)**.  
It provides comprehensive RESTful APIs for music learning, AI-powered practice plan generation, quizzes, and more.

---

## 📋 Table of Contents
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Setup](#-setup)
- [API Routes](#-api-routes)
- [Database Models](#-database-models)
- [Development](#-development)

---

## ✨ Features

- **Authentication**: JWT-based token authentication with refresh tokens
- **User Management**: User profiles with instrument, skill level, and learning goals
- **AI-Powered Quizzes**: Generate quizzes using Claude AI with function calling
- **Practice Plans**: Auto-generate personalized daily practice plans  
- **Song Timelines**: AI-generated song performance tutorials with note sequences
- **Progress Tracking**: Detailed progress summaries and practice session logging
- **Token System**: AI token budgeting for free vs premium users
- **Lessons**: Structured learning content organized by category

---

## 🛠️ Tech Stack

- **Framework**: Django 5.x
- **API**: Django REST Framework (DRF)
- **Database**: SQLite (development), PostgreSQL (production-ready)
- **Authentication**: djangorestframework-simplejwt
- **AI Integration**: Anthropic Claude API
- **Timezone Support**: pytz for Pacific Time tracking

---

## 🚀 Setup

### 1. Activate Virtual Environment
```bash
# Windows (PowerShell)
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Migrations
```bash
python manage.py migrate
```

### 4. Create Superuser (Optional)
```bash
python manage.py createsuperuser
```

### 5. Start Development Server
```bash
python manage.py runserver
```

Server will run at `http://localhost:8000`

---

## 🔌 API Routes

### Authentication (`/api/auth/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register/` | Register new user | ❌ |
| POST | `/login/` | Login with email & password | ❌ |
| POST | `/token/refresh/` | Refresh access token | ❌ |
| POST | `/forgot-password/` | Request password reset | ❌ |
| GET | `/profile/` | Get current user profile | ✅ |
| PUT | `/profile/` | Update user profile | ✅ |
| DELETE | `/profile/` | Delete user account permanently | ✅ |

**Example: Login**
```bash
POST /api/auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

# Response (200 OK)
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Example: Update Profile**
```bash
PUT /api/auth/profile/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "instrument": "Guitar",
  "skill_level": "Intermediate",
  "learning_goal": "Performance Mastery"
}
```

---

### AI Utils - Quiz (`/api/ai/quiz/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/quiz/generate/` | Generate quiz via AI (function calling) | ✅ |
| POST | `/quiz/create/` | Create quiz from function call response | ✅ |
| GET | `/quiz/list/` | List all user's AI-generated quizzes | ✅ |
| GET | `/quiz/for-step/{step_id}/` | Get cached quiz for practice step | ✅ |
| DELETE | `/quiz/{quiz_id}/delete/` | Delete a specific quiz | ✅ |

**Example: Generate Quiz**
```bash
POST /api/ai/quiz/generate/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "userMessage": "Generate a music theory quiz about scales for Guitar"
}

# Response includes function call template
```

---

### AI Utils - Practice Plans (`/api/ai/generate-practice-plan/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/generate-practice-plan/` | Generate personalized daily practice plan | ✅ |

**Example: Generate Practice Plan**
```bash
POST /api/ai/generate-practice-plan/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "duration_goal": 30,
  "focus_areas": ["Finger Strength", "Chord Transitions"],
  "difficulty": "intermediate",
  "wish": "Want to play smoother chord changes"
}

# Response includes daily plan with exercises
```

---

### AI Utils - Songs (`/api/ai/generate-song-timeline/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/generate-song-timeline/` | AI generates song performance guide | ✅ |
| GET | `/ai/song/for-step/{step_id}/` | Get cached song timeline for step | ✅ |

**Example: Generate Song Timeline**
```bash
POST /api/ai/generate-song-timeline/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "song_title": "Ode to Joy",
  "skill_level": "Beginner",
  "instrument": "Guitar",
  "practice_card_title": "Your Daily Song",
  "generation_intent": "practice_card"
}

# Response includes note sequences and performance timeline
```

---

### AI Utils - Tokens (`/api/ai/tokens/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/tokens/` | Get remaining AI token balance | ✅ |

**Response**
```json
{
  "tokens_remaining": 10
}
```

---

### AI Utils - Progress (`/api/ai/progress/detailed-summary/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/progress/detailed-summary/` | Generate AI progress summary | ✅ |

---

### AI Utils - Session (`/api/ai/complete-practice-session/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/complete-practice-session/` | Log completion of practice session | ✅ |

---

### Exercises (`/api/exercises/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/objects/` | List all exercises | ✅ |
| POST | `/objects/` | Create new exercise | ✅ |
| GET | `/objects/{id}/` | Get specific exercise | ✅ |
| PUT | `/objects/{id}/` | Update exercise | ✅ |
| DELETE | `/objects/{id}/` | Delete exercise | ✅ |
| GET | `/plans/` | List all practice plans | ✅ |
| POST | `/plans/` | Create practice plan | ✅ |
| GET | `/plans/today/` | Get today's active plan (returns 200 with empty if none) | ✅ |
| POST | `/plans/generate/` | AI-generate practice plan | ✅ |

---

### Learn (`/api/learn/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/lessons/` | List all lessons | ✅ |
| GET | `/lessons/{id}/` | Get specific lesson | ✅ |
| POST | `/lessons/` | Create lesson | ✅ |
| PUT | `/lessons/{id}/` | Update lesson | ✅ |
| DELETE | `/lessons/{id}/` | Delete lesson | ✅ |

---

## 🗄️ Database Models

### User
- `email` - Unique email address
- `username` - Unique username
- `first_name`, `last_name` - Full name
- `failed_login_attempts` - Track login failures
- `is_locked` - Account lock status
- `locked_until` - Lock expiration timestamp
- `last_token_refresh_date` - Last midnight PT token refresh

### UserProfile
- `user` - OneToOne relationship to User
- `skill_level` - 'Beginner', 'Intermediate', 'Advanced'
- `instrument_name` - preferred instrument
- `learning_goal_text` - user's learning goals
- `bio` - user bio
- `practice_streak` - consecutive practice days
- `last_practice_date` - timestamp of last practice
- `total_practice_minutes` - cumulative practice time

### DailyPlan
- `user` - ForeignKey to User
- `plan_json` - Full plan structure (JSON)
- `skill_level` - Plan difficulty
- `instrument` - Target instrument
- `created_at` - Timestamp
- `status` - 'active', 'completed', 'archived'

### AIGeneratedQuiz
- `user` - ForeignKey to User
- `title`, `category` - Quiz info
- `questions` - JSON array of questions
- `skill_level` - Difficulty level
- `created_at` - Timestamp

### AIGeneratedSong
- `user` - ForeignKey to User
- `title` - Song name
- `timeline_events` - JSON performance guide
- `created_at` - Timestamp

---

## 📝 Development

### Running Tests
```bash
python manage.py test
```

### Creating Migrations
```bash
# Auto-detect changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

### Django Admin
Access at `http://localhost:8000/admin/` with superuser credentials

### Environment Variables
Create a `.env` file:
```
DEBUG=True
SECRET_KEY=your-secret-key
ANTHROPIC_API_KEY=your-claude-api-key
ALLOWED_HOSTS=localhost,127.0.0.1
```

---

## 🔐 Authentication

This API uses **JWT (JSON Web Tokens)** for authentication:

1. User logs in → receives `access` and `refresh` tokens
2. Include `Authorization: Bearer {access}` header for authenticated requests
3. When access expires, use refresh token to get new access token
4. Tokens refresh automatically at midnight PT for token resets

---

## 📞 Support

For issues or questions, check the main README or contact the development team.
