# MissNova — Vercel Deployment Guide

> What is the project, what broke, why it broke, and exactly how each problem is fixed.

---

## 1. What Is This Project?

MissNova is a full-stack AI communication coaching app. It has two completely separate codebases that must **both** work on Vercel.

```
MissNova/
├── frontend/          ← React 19 + Vite + TailwindCSS  (UI)
├── backend/           ← FastAPI + SQLite  (business logic)
├── api/
│   ├── index.py       ← Vercel's Python entry point (bridges → backend/)
│   └── requirements.txt
└── vercel.json        ← Deployment configuration
```

---

## 2. How Vercel Deploys This App

```mermaid
flowchart TD
    A[vercel deploy --prod] --> B{vercel.json}

    B --> C[Frontend Build\nnpm ci + npm run build\ninside frontend/]
    B --> D[Python Serverless Function\napi/index.py]

    C --> E[frontend/dist/\nstatic HTML + JS + CSS]
    D --> F[Imports backend/main.py\nFastAPI app as 'app']

    E --> G[Vercel CDN\nServes all static files]
    F --> H[Vercel Lambda\nRuns on each API request]

    G --> I[User visits miss-nova.vercel.app]
    H --> I

    I --> J{Request type?}
    J -->|/api/...| K[Python Function handles it\nGroq AI, Auth, DB]
    J -->|/anything-else| L[CDN serves index.html\nReact Router takes over]
```

---

## 3. The Problems — Full List

There are **8 bugs** that prevent the app from working correctly. They fall into 3 categories:

```mermaid
mindmap
  root((Deployment Bugs))
    Frontend Build Crashes
      B1 axios not installed
      B2 TypeScript syntax in .js file
      B3 Python docstring in JS file
    Python API Crashes at Runtime
      B4 auth.py writes to read-only filesystem
      B5 Missing /api/auth/refresh endpoint
    Browser Rejects API Calls
      B6 CORS wildcard + credentials forbidden
      B7 No maxDuration - AI calls timeout
      B8 No version pins - silent breakage
```

---

## 4. Problem Deep Dives + Fixes

---

### B1 — `axios` is Not Installed (Build Crash)

**Where:** `frontend/src/api/config.js`

**What happens:**

```mermaid
sequenceDiagram
    participant Vercel
    participant Vite
    participant config.js

    Vercel->>Vite: npm run build
    Vite->>config.js: bundle import
    config.js-->>Vite: import axios from 'axios'
    Vite-->>Vercel: ❌ ERROR: Cannot find package 'axios'
    Note over Vercel: Build fails. No frontend is deployed.
```

**Root cause:** `axios` is used in `frontend/src/api/config.js` but was never added to `frontend/package.json`.

**Fix:** Add `"axios": "^1.7.9"` to `dependencies` in `frontend/package.json`.

---

### B2 + B3 — TypeScript Syntax and Python Docstring in a `.js` File (Build Crash)

**Where:** `frontend/src/api/config.js`

**What happens:**

```mermaid
flowchart LR
    A[config.js] --> B{Vite esbuild parser}
    B --> C["Line 1: triple-quoted string\n\"\"\"Axios API Configuration...\"\"\"\n❌ SyntaxError: Invalid JS"]
    B --> D["Line 20: TS type annotation\nlet accessToken: string | null\n❌ Cannot parse .js as TypeScript"]
    C --> E[Build fails immediately]
    D --> E
```

**Root cause:**

- The file starts with `"""..."""` — that is a Python docstring, completely invalid JavaScript
- Throughout the file, TypeScript type annotations are used: `string | null`, `?: string`, `Promise<string | null>`, `: any` — Vite does not treat `.js` files as TypeScript

**Fix:**

- Remove the `"""..."""` block at the top, replace with a standard JS comment `// ...`
- Strip all TypeScript annotations from the file, keeping identical logic

---

### B4 — `auth.py` Writes to the Read-Only Filesystem (Runtime Crash)

**Where:** `backend/routers/auth.py`

**What happens:**

```mermaid
flowchart TD
    A[User calls POST /api/auth/guest-login] --> B[auth.py: save_user_data]
    B --> C{Where does it write?}
    C --> D["/var/task/backend/auth_data.json\nVercel deployed code layer"]
    D --> E["❌ OSError: Read-only file system\nErrno 30"]
    E --> F[500 Internal Server Error returned to user]

    style D fill:#ff6b6b,color:#fff
    style E fill:#ff6b6b,color:#fff
```

**Why this happens on Vercel:**

```mermaid
graph LR
    subgraph "Vercel Lambda Filesystem"
        A["/var/task/\nYour deployed code\n🔒 READ-ONLY"]
        B["/tmp/\nTemporary scratch space\n✅ WRITABLE up to 512MB"]
    end

    C[auth_data.json write attempt] --> A
    A --> D[❌ CRASH]

    C2[auth_data.json write attempt\nAfter fix] --> B
    B --> E[✅ Success]
```

**Fix:**

1. In `api/index.py`, add `os.environ.setdefault("AUTH_DATA_FILE", "/tmp/auth_data.json")` before importing backend
2. In `backend/routers/auth.py`, change the hardcoded path to read from `AUTH_DATA_FILE` env var

---

### B5 — `/api/auth/refresh` Endpoint Does Not Exist (Redirect Loop)

**Where:** `frontend/src/api/config.js` calls it; `backend/routers/auth.py` never defines it

**What happens when a token expires:**

```mermaid
sequenceDiagram
    participant Browser
    participant API

    Browser->>API: Any API call (token expired)
    API-->>Browser: 401 Unauthorized
    Browser->>API: POST /api/auth/refresh  ← config.js interceptor
    API-->>Browser: 404 Not Found
    Browser->>Browser: clearAuthToken() + redirect to /
    Note over Browser: User gets sent to homepage immediately
    Browser->>API: Any API call (token expired again)
    API-->>Browser: 401 again
    Note over Browser: 🔄 Infinite redirect loop
```

**Fix:** Add a `POST /api/auth/refresh` route to `backend/routers/auth.py` that validates the current token and issues a fresh one (or returns 401 if invalid).

---

### B6 — CORS Wildcard + Credentials = Browser Blocks All Auth (Silent Failure)

**Where:** `backend/main.py`

**The broken config:**

```python
allow_origins=["*"],         # wildcard
allow_credentials=True,      # credentials
```

**Why browsers reject this:**

```mermaid
flowchart TD
    A[Browser sends authenticated request\nwith cookies / Authorization header] --> B{CORS Preflight Check}
    B --> C["Server responds:\nAccess-Control-Allow-Origin: *\nAccess-Control-Allow-Credentials: true"]
    C --> D{Browser CORS spec check}
    D --> E["🚫 SPEC: wildcard origin + credentials\nis EXPLICITLY FORBIDDEN\nby the Fetch specification"]
    E --> F[Browser blocks the response]
    F --> G[Every API call fails silently\nUser cannot log in, no AI features work]

    style E fill:#ff6b6b,color:#fff
    style F fill:#ff6b6b,color:#fff
```

**Fix:** Change `allow_origins=["*"]` to `allow_origins=["https://miss-nova.vercel.app"]` in `backend/main.py`.

---

### B7 — AI Calls Timeout (30s Groq Requests Hit 10s Default Limit)

**Where:** `vercel.json` — missing `functions.maxDuration`

**What happens:**

```mermaid
gantt
    title Request Timeline (AI scenario chat)
    dateFormat  s
    axisFormat  %Ss

    section Without fix (default 10s)
    Vercel default timeout :crit, 0, 10s
    Groq API call         :active, 0, 25s
    Timeout kills lambda  :milestone, 10s, 0s

    section After fix (maxDuration 30)
    Extended timeout      :done, 0, 30s
    Groq API call         :active, 0, 25s
    Response returned ok  :milestone, 25s, 0s
```

**Fix:** Add to `vercel.json`:

```json
"functions": {
  "api/index.py": { "maxDuration": 30 }
}
```

---

### B8 — No Version Pins = Silent Breakage on Next Deploy

**Where:** `api/requirements.txt`

**The problem:**

```mermaid
flowchart LR
    A["requirements.txt\nfastapi\npydantic\ngroq\nno versions pinned"] --> B[Vercel build\npip install latest]
    B --> C{"fastapi 1.0 released?\nBreaking changes"}
    B --> D{"pydantic v3 released?\nCompletely different API"}
    C --> E["❌ App crashes on next deploy\nwithout any code change"]
    D --> E
```

**Fix:** Pin all packages in `api/requirements.txt`:

```
fastapi>=0.115,<1
pydantic>=2,<3
sqlalchemy>=2,<3
groq>=0.11,<1
python-jose[cryptography]>=3.3,<4
passlib[argon2]>=1.7,<2
```

---

## 5. Complete Fix Flow

```mermaid
flowchart TD
    START([Start: vercel deploy broken]) --> F1

    F1["Fix B1 + B2 + B3\nfrontend/package.json + config.js\nAxios added, TS types stripped,\nPython docstring removed"] --> F2

    F2["Fix B4\napi/index.py + auth.py\nFile writes redirected to /tmp"] --> F3

    F3["Fix B5\nbackend/routers/auth.py\nAdd POST /api/auth/refresh endpoint"] --> F4

    F4["Fix B6\nbackend/main.py\nCORS: replace wildcard with\nhttps://miss-nova.vercel.app"] --> F5

    F5["Fix B7\nvercel.json\nmaxDuration: 30 for Python function"] --> F6

    F6["Fix B8\napi/requirements.txt\nVersion pins added to all packages"] --> F7

    F7["Manual Step\nVercel Dashboard → Project Settings\nAdd GROQ_API_KEY + SECRET_KEY"] --> DEPLOY

    DEPLOY([vercel deploy --prod]) --> V1

    V1["✅ GET / → 200 OK\nReact app loads"] --> V2
    V2["✅ GET /api/health → 200 JSON\nPython function starts correctly"] --> V3
    V3["✅ POST /api/auth/guest-login → 200\nNo filesystem crash"] --> V4
    V4["✅ Authenticated fetch from browser → 200\nNo CORS error in DevTools"] --> V5
    V5["✅ AI chat request → responds within 30s\nNo timeout error"]
```

---

## 6. Environment Variables (Manual Step)

These **cannot** be committed to code. They must be added in the **Vercel Dashboard → Project Settings → Environment Variables**.

| Variable       | Required | Description                                                                      |
| -------------- | -------- | -------------------------------------------------------------------------------- |
| `GROQ_API_KEY` | ✅ Yes   | All AI features (chat, scenario, evaluation) will return 500 without this        |
| `SECRET_KEY`   | ✅ Yes   | Used to sign JWT auth tokens. Use a long random string                           |
| `DATABASE_URL` | Optional | Defaults to SQLite in `/tmp`. Set a Postgres URL (e.g. Neon) for persistent data |

> **Note on SQLite + Vercel:** The default SQLite database lives in `/tmp` — it is wiped on every cold start (typically after ~1 hour of inactivity). User accounts will not persist between sessions. For persistent logins, set `DATABASE_URL` to a free [Neon](https://neon.tech) Postgres database. No code changes are needed — SQLAlchemy handles both automatically.

---

## 7. Current Status of Each File

| File                         | Status     | What needs fixing                                            |
| ---------------------------- | ---------- | ------------------------------------------------------------ |
| `vercel.json`                | ⚠️ Partial | Add `functions.maxDuration: 30`                              |
| `api/index.py`               | ✅ Fixed   | `/tmp` redirects already applied for DB and `USERS_DATA_DIR` |
| `backend/main.py`            | ⚠️ Partial | `USERS_DATA_DIR` fixed; CORS still uses wildcard             |
| `backend/routers/auth.py`    | ❌ Broken  | Writes to read-only path; no `/refresh` route                |
| `frontend/src/api/config.js` | ❌ Broken  | Python docstring at top; TypeScript syntax; `axios` missing  |
| `frontend/package.json`      | ❌ Broken  | `axios` dependency not listed                                |
| `api/requirements.txt`       | ⚠️ Risky   | No version pins on any package                               |
