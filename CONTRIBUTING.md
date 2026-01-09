# Contributing

Thanks for your interest in contributing.

This repository is primarily maintained as a personal, production-focused project. Contributions are welcome as long as they align with the project’s direction and quality standards.

---

## Development Setup

You can run the project locally using one of the options below.

### Prerequisites
- Node.js 18 or newer
- Python 3.11 or newer
- Yarn
- MongoDB (local or Atlas) if not using Docker

---

### Frontend

From the project root:
cd frontend  
yarn install  
yarn dev  

The frontend will be available at:
http://localhost:3000

---

### Backend

From the project root:
cd backend  

Create and activate a virtual environment (recommended):
python -m venv .venv  
source .venv/bin/activate  

Install dependencies:
pip install -r requirements.txt  

Run the API server:
uvicorn server:app --reload --port 8001  

The backend will be available at:
http://localhost:8001

---

### Docker (recommended for full stack development)

Docker provides the most consistent setup and runs all required services.

From the project root:
docker compose -f docker-compose.dev.yml up --build  

This starts:
- MongoDB
- FastAPI backend (hot reload)
- Next.js frontend (dev server)

---

Choose the setup that best fits your workflow. Docker is recommended if you want a zero-config environment.

---

## Contribution Guidelines

Please follow these guidelines to keep reviews fast and productive:

- Keep pull requests focused and minimal
- Prefer one logical change per pull request
- Add screenshots or GIFs for UI-related changes
- Avoid committing secrets or real credentials
- Update `.env.example` files when environment variables change
- Ensure existing functionality is not broken

---

## Code Quality

### Frontend
- Follow the existing component structure and naming
- Keep components readable and reasonably scoped
- Avoid unnecessary abstractions

### Backend
- Keep endpoints typed and validated
- Prefer explicit logic over hidden or implicit behavior
- Do not weaken authentication or security flows

---

## Branch Naming

Use clear and consistent branch names:

- feat/short-description — new features
- fix/short-description — bug fixes
- docs/short-description — documentation updates
- refactor/short-description — internal refactors

Example branch names:
- feat/add-blog-search
- fix/admin-auth-redirect

---

## Pull Requests

A good pull request includes:
- A clear description of what changed and why
- Screenshots or recordings for UI changes
- Notes about any breaking or behavioral changes

The maintainer may request changes or close pull requests that do not align with the project’s goals.

---

By contributing to this repository, you agree to follow the project’s Code of Conduct.
