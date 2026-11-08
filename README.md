# BEU–HEU Faculty Evaluation System

React + Vite frontend, Express/Node.js backend, and JSON-file data storage. The college logo supplied for this project is included in `frontend/public/school-logo.jfif`.

## Deployment layout (Option 2)

- **Frontend:** Deploy the `frontend` folder as a Vercel project.
- **Backend:** Deploy the `backend` service separately on Render (or another Node.js host that provides a persistent disk/volume).
- **Storage:** Keep JSON files on the backend host's persistent disk. Do not store changing JSON data inside Vercel functions or an ephemeral server filesystem.

> **Important about JSON persistence:** Vercel is used only for the React frontend. The API runs as a long-lived Node.js service on a separate host. The backend must be attached to a persistent disk/volume. The included `render.yaml` configures a Render Starter web service and a 1 GB persistent disk; persistent disks are a paid hosting feature. A free/ephemeral backend may lose user registrations and evaluations after restart or redeploy. If you choose another host, configure its persistent volume and set `DATA_DIR` to the mounted directory.

## 1. Run locally

Requirements: Node.js 18+ and npm.

### Terminal 1 — backend

```bash
cd backend
npm install
node server.js
```

API: `http://localhost:5000`

### Terminal 2 — frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

## 2. Deploy the backend separately (Render example)

1. Push the complete project folder to a GitHub repository.
2. In Render, choose **New → Blueprint** and connect the repository. Render will read the root `render.yaml`.
3. Confirm the service is created with:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Persistent disk mount path: `/var/data`
   - `DATA_DIR=/var/data`
4. Deploy the service and copy its public URL, for example `https://your-api-name.onrender.com`.
5. In the backend service environment settings, add `CORS_ORIGIN` with your actual Vercel frontend URL, for example `https://your-project.vercel.app`. If you have a custom domain, include it as another comma-separated origin. Keep `ALLOW_VERCEL_PREVIEWS=true` only if you want preview deployments to access the API.
6. Confirm the API health endpoint works: `https://your-api-name.onrender.com/api/health`. It should return JSON with `"status":"ok"`.

The service generates a `JWT_SECRET` through the Render blueprint. Do not publish or share this secret. Keep the persistent disk attached when redeploying.

## 3. Deploy the frontend to Vercel

1. In Vercel, choose **Add New → Project** and import the same GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Add this environment variable in Vercel Project Settings → Environment Variables:

```env
VITE_API_URL=https://your-api-name.onrender.com/api
```

Replace the example URL with the real backend URL. Do not add a trailing slash.
5. Deploy (or redeploy after adding/changing the environment variable).
6. Add your final Vercel domain to the backend's `CORS_ORIGIN` environment variable if it is not already there, then redeploy/restart the backend.

The `frontend/vercel.json` file provides SPA routing so refreshing a page does not return a Vercel 404.

## 4. JSON data files

The backend uses these files inside the directory set by `DATA_DIR`:

- `users.json` — registered student accounts (passwords are hashed).
- `subjects.json` — demo enrolled subjects and faculty.
- `evaluations.json` — submitted evaluation records.

On Render, the files are stored under `/var/data` because that is the persistent disk mount. On your local computer, they are stored in `backend/data/`.

Edit `backend/data/subjects.json` before the first deployment to replace the sample subject/faculty information with your real academic data. For an already deployed service, update the JSON data on the persistent volume using your host's supported method; changing the repository seed file will not overwrite an existing data file.

## 5. Included functionality

- Student registration and sign in
- Hashed passwords and JWT-based authentication
- View current semester subjects
- Search subjects and faculty
- Five-criteria faculty evaluation (1–5) with optional comments
- Submit evaluations and prevent duplicate submissions for the same subject
- Dashboard progress and recent submissions
- Student's own evaluation history
- Responsive interface with the supplied college logo

## 6. Security and project limitations

This is a school-project starter, not a production-ready institutional platform. Before real institutional use, add admin roles and controlled subject/enrollment management, rate limiting, stronger input validation, backups, audit logs, and a database or carefully managed storage strategy. The current demo sends the same sample subject list to every registered student and does not include an administrator reporting dashboard. Keep `JWT_SECRET` private and use HTTPS. JSON-file storage is suitable for a small demonstration, but it is not ideal for concurrent high-volume use or multiple backend instances.
