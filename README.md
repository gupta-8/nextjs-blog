<div align="center">

# Next.js Portfolio & Blog

### A Modern Full-Stack Portfolio with Liquid Glass UI

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**A stunning portfolio website with an innovative liquid glass navigation, full-featured blog, and comprehensive admin dashboard.**

[Live Demo](nextjs-blog.up.railway.app) · [Report Bug](https://github.com/gupta-8/nextjs-blog/issues) · [Request Feature](https://github.com/gupta-8/nextjs-blog/issues)

</div>

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Railway Deployment](#-railway-deployment)
- [Creating Admin User](#-creating-admin-user)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## ✨ Features

### 🎨 Liquid Glass Navigation
A unique, Apple-inspired navigation system with stunning visual effects:
- **Glassmorphism Design** - Frosted glass effect with backdrop blur
- **Animated Hover Bubble** - Smooth liquid-like hover animations
- **Moving Indicator** - Active page indicator with fluid transitions
- **Touch Support** - Long-press and drag navigation on mobile devices
- **SVG Filters** - Custom gooey effect using SVG filters

### 🏠 Public Pages

| Page | Features |
|------|----------|
| **Home** | Hero section, featured projects, skills showcase, testimonials |
| **Blog** | 3-column grid, categories, tags, search, reading time estimates |
| **Blog Post** | Markdown rendering, syntax highlighting, table of contents, related posts |
| **About** | Bio, experience timeline, skills with progress bars, downloadable resume |
| **Contact** | Contact form, social links, location info |

### 📝 Blog System
- **Markdown Editor** - Rich text editing with live preview
- **Syntax Highlighting** - Code blocks with language detection
- **Categories & Tags** - Organize posts with multiple taxonomies
- **Featured Posts** - Highlight important articles
- **Reading Time** - Automatic calculation based on content
- **SEO Optimized** - Meta tags, Open Graph, structured data

### 🔐 Admin Dashboard
Complete content management system with:

| Section | Capabilities |
|---------|--------------|
| **Dashboard** | Analytics overview, recent activity, quick stats |
| **Blog Manager** | Create, edit, delete posts; manage drafts; bulk actions |
| **File Manager** | Upload images/files, organize media, copy URLs |
| **Comments** | Moderate comments, approve/reject, spam filtering |
| **Profile** | Update bio, social links, avatar, resume |
| **Security** | 2FA setup (TOTP), passkey/WebAuthn, email OTP |

### 🔒 Security Features
- **JWT Authentication** - Secure token-based auth
- **Two-Factor Authentication** - TOTP (Google Authenticator)
- **Passkey Support** - WebAuthn/FIDO2 passwordless login
- **Email OTP** - One-time password via email
- **Rate Limiting** - Brute force protection
- **CORS Protection** - Configurable origins
- **Security Headers** - XSS, CSRF, clickjacking protection

### 🎯 Additional Features
- **Dark Theme** - Elegant dark mode with purple accents
- **Fully Responsive** - Mobile-first design
- **Fast Performance** - Optimized images, lazy loading
- **SEO Ready** - Meta tags, sitemaps, robots.txt
- **Terminal Footer** - Unique CLI-style footer with live stats
- **File Storage** - Persistent volume storage on Railway

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS, shadcn/ui |
| **Backend** | FastAPI, Python 3.11, Pydantic, Motor |
| **Database** | MongoDB Atlas |
| **Storage** | Railway Volume |
| **Deployment** | Railway |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **Python** 3.11+
- **MongoDB** (local or Atlas)
- **Yarn** package manager

### Local Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/gupta-8/nextjs-blog.git
   cd nextjs-blog
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   yarn install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   pip install -r requirements.txt
   ```

4. **Set up environment variables** (see [Environment Variables](#-environment-variables))

5. **Start the development servers**

   Backend:
   ```bash
   cd backend
   uvicorn server:app --reload --host 0.0.0.0 --port 8001
   ```

   Frontend:
   ```bash
   cd frontend
   yarn dev
   ```

6. **Open** [http://localhost:3000](http://localhost:3000)

---

## 🔑 Environment Variables

### Backend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGODB_URI` | ✅ Yes | MongoDB connection string | `mongodb+srv://cxx:xxx@cluster.xxx/db` |
| `DB_NAME` | ✅ Yes | Database name | `portfolio` |
| `JWT_SECRET_KEY` | ✅ Yes | Secret key for JWT (min 32 chars) | `${{ secret() }}` |
| `CORS_ORIGINS` | ✅ Yes | Frontend URL (comma-separated) | `https://your-frontend.up.railway.app` |

### Frontend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | ✅ Yes | Backend API URL | `https://your-backend.up.railway.app` |

---

## 🚂 Railway Deployment

This project uses **Nixpacks** (Railway's auto-detection) for deployment - no Dockerfile needed!

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **"Login"** → **"Login with GitHub"**
3. Authorize Railway to access your GitHub

---

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Empty Project"**
3. Name your project (e.g., `portfolio`)

---

### Step 3: Set Up MongoDB

**Option A: Railway MongoDB (Easiest)**
1. In your project, click **"+ New"**
2. Select **"Database"** → **"MongoDB"**
3. Wait for it to provision
4. The `MONGODB_URI` will be available as a reference variable

**Option B: MongoDB Atlas (Free Tier)**
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free cluster (M0)
3. **Network Access** → Add `0.0.0.0/0`
4. **Database Access** → Create user
5. **Connect** → **Drivers** → Copy connection string

---

### Step 4: Deploy Backend

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose your repository
4. In **Settings** → **Build** → Set **Root Directory**: `backend`
5. Railway will auto-detect Python and build with Nixpacks

**Add Environment Variables:**

Click on the backend service → **"Variables"** tab → **"+ New Variable"**

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `${{MongoDB.MONGODB_URI}}` or your Atlas connection string |
| `DB_NAME` | `portfolio` |
| `JWT_SECRET_KEY` | `${{ secret() }}` (Railway auto-generates) |
| `CORS_ORIGINS` | `https://your-frontend.up.railway.app` (add after frontend deploy) |

**Generate Domain:**

1. Click **"Settings"** tab
2. Under **"Networking"** → Click **"Generate Domain"**
3. Copy the URL (e.g., `your-backend-xyz.up.railway.app`)

---

### Step 5: Deploy Frontend

1. Click **"+ New"** → **"GitHub Repo"**
2. Choose the same repository
3. In **Settings** → **Build** → Set **Root Directory**: `frontend`
4. Railway will auto-detect Next.js and build with Nixpacks

**Add Environment Variables:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_BACKEND_URL` | `https://your-backend-xyz.up.railway.app` |

**Generate Domain:**

1. Click **"Settings"** tab
2. Under **"Networking"** → Click **"Generate Domain"**
3. Copy the URL (e.g., `your-frontend-abc.up.railway.app`)

---

### Step 6: Update Backend CORS

Go back to your backend service → **"Variables"** → Update:

| Variable | Value |
|----------|-------|
| `CORS_ORIGINS` | `https://your-frontend-abc.up.railway.app` |

The backend will automatically redeploy.

---

### Step 7: Add Custom Domain (Optional)

1. Click on frontend service → **"Settings"**
2. Under **"Networking"** → **"Custom Domain"**
3. Enter your domain: `yourdomain.com`
4. Add DNS records at your registrar:

   | Type | Name | Value |
   |------|------|-------|
   | CNAME | @ | `your-frontend-abc.up.railway.app` |
   | CNAME | www | `your-frontend-abc.up.railway.app` |

5. Wait for DNS propagation (5-30 minutes)
6. Update environment variables with your custom domain

---

### Step 8: Add Persistent Storage for Uploads (Optional)

1. Click on backend service → **"Volumes"**
2. Click **"+ New Volume"**
3. Mount path: `/uploads`
4. The backend will redeploy with persistent storage

---

## 👤 Creating Admin User

After deployment, you have two options to create your admin account:

### Option 1: Setup Page (Recommended) 🎨

Simply visit your setup page:

```
https://your-frontend-abc.up.railway.app/setup
```

You'll see a beautiful setup form where you can enter:
- **Full Name** - Your display name
- **Email Address** - Your admin email
- **Password** - Minimum 8 characters

After creating your account, you'll be redirected to the login page.

> ⚠️ **Note:** The setup page only works when no admin account exists. After the first admin is created, this page will redirect to login.

---

### Option 2: Using cURL (Command Line)

```bash
curl -X POST https://your-backend-xyz.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YourSecurePassword123!",
    "name": "Admin"
  }'
```

**Expected Response:**
```json
{
  "id": "abc123",
  "email": "admin@example.com",
  "name": "Admin"
}
```

### Using HTTPie

```bash
http POST https://your-backend-xyz.up.railway.app/api/auth/register \
  email=admin@example.com \
  password=YourSecurePassword123! \
  name=Admin
```

### Using JavaScript (Browser Console)

```javascript
fetch('https://your-backend-xyz.up.railway.app/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'YourSecurePassword123!',
    name: 'Admin'
  })
}).then(r => r.json()).then(console.log);
```

### After Registration

1. Go to `https://your-frontend-abc.up.railway.app/admin`
2. Enter your email and password
3. Start managing your portfolio!

> ⚠️ **Note:** After creating the first user, registration is automatically disabled for security.

---

## 📚 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login and get JWT token |
| `GET` | `/api/auth/me` | Get current user info |

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/profile` | Get public profile |
| `GET` | `/api/blogs` | List all published posts |
| `GET` | `/api/blogs/{slug}` | Get single post by slug |
| `GET` | `/api/projects` | List all projects |
| `GET` | `/api/skills` | List all skills |

### Admin Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/blogs` | List all posts (including drafts) |
| `POST` | `/api/admin/blogs` | Create new post |
| `PUT` | `/api/admin/blogs/{id}` | Update post |
| `DELETE` | `/api/admin/blogs/{id}` | Delete post |
| `POST` | `/api/upload` | Upload file |
| `GET` | `/api/admin/files` | List uploaded files |
| `DELETE` | `/api/admin/files/{filename}` | Delete file |

---

## 📁 Project Structure

```
nextjs-blog/
├── 📄 README.md
│
├── 📂 backend/
│   ├── 📄 Dockerfile           # Docker configuration
│   ├── 📄 railway.toml         # Railway configuration
│   ├── 📄 server.py            # FastAPI application
│   ├── 📄 auth.py              # JWT authentication
│   ├── 📄 requirements.txt     # Python dependencies
│   │
│   ├── 📂 routes/
│   │   ├── admin_routes.py     # Admin API endpoints
│   │   ├── auth_routes.py      # Authentication endpoints
│   │   └── security_routes.py  # 2FA, passkey endpoints
│   │
│   ├── 📂 storage/
│   │   └── blob_storage.py     # File storage
│   │
│   └── 📂 utils/
│       ├── crypto.py           # Encryption utilities
│       └── rate_limiter.py     # Rate limiting
│
└── 📂 frontend/
    ├── 📄 Dockerfile           # Docker configuration
    ├── 📄 railway.toml         # Railway configuration
    ├── 📄 next.config.js       # Next.js configuration
    ├── 📄 package.json
    │
    ├── 📂 app/                  # Next.js App Router
    │   ├── layout.js
    │   ├── page.js
    │   ├── 📂 (public)/        # Public routes
    │   └── 📂 admin/           # Admin routes
    │
    ├── 📂 src/
    │   ├── 📂 components/
    │   │   ├── 📂 liquid-glass/  # Liquid glass navigation
    │   │   ├── 📂 ui/            # shadcn/ui components
    │   │   └── 📂 editor/        # Blog editor
    │   │
    │   ├── 📂 views/             # Page components
    │   ├── 📂 hooks/             # Custom React hooks
    │   └── 📂 contexts/          # React contexts
    │
    └── 📂 public/                # Static assets
```

---

## 🔧 Troubleshooting

<details>
<summary><b>Build Fails on Railway</b></summary>

- Check build logs in Railway dashboard
- Verify Dockerfile is in the correct directory
- Ensure all dependencies are in requirements.txt / package.json

</details>

<details>
<summary><b>MongoDB Connection Error</b></summary>

- Verify `MONGODB_URI` is correct
- For Atlas: Ensure `0.0.0.0/0` is in Network Access
- Check database user has read/write permissions

</details>

<details>
<summary><b>CORS Errors</b></summary>

- Ensure `CORS_ORIGINS` includes your frontend URL
- Include the full URL with `https://`
- Redeploy backend after updating

</details>

<details>
<summary><b>File Upload Not Working</b></summary>

- Add a volume to backend service (mount: `/uploads`)
- Redeploy the backend service

</details>

<details>
<summary><b>Admin Login Fails</b></summary>

- Ensure you've created an admin user via cURL
- Check `JWT_SECRET` is set
- Verify backend is running (check health endpoint)

</details>

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
