# Running the NHS Demo

## 1. Setup

Run the setup script once to clone all three repos:

```powershell
.\setup.ps1
```

## 2. Prerequisites

- [Podman Desktop](https://podman-desktop.io/) installed and running
- Python 3.11+ with a virtual environment in `SovereignAgenticArchitectureZoneOne/.venv`
- Node.js 18+

Install Zone 1 dependencies (first time only):

```powershell
cd SovereignAgenticArchitectureZoneOne
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r runtime/requirements.txt
```

Install UI dependencies (first time only):

```powershell
cd NHS_Edge_App/ui
npm install
```

## 3. Start (three terminals)

**Terminal 1 — Zone 2 (Podman containers)**

```powershell
cd SovereignAgenticArchitectureZoneTwo
podman-compose up -d
```

**Terminal 2 — Zone 1**

```powershell
cd SovereignAgenticArchitectureZoneOne
.venv\Scripts\Activate.ps1
uvicorn zone1.api.http.main:app --host 127.0.0.1 --port 8001
```

**Terminal 3 — UI**

```powershell
cd NHS_Edge_App/ui
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) and log in with:

- **Username**: `clinician-a`
- **Password**: `password`

## 4. WSL2 IP (if Zone 2 is unreachable)

Podman containers run inside WSL2. If Zone 1 can't reach Zone 2, check the WSL2 IP:

```powershell
podman machine ssh "ip addr show eth0"
```

Update the IP in:
- `SovereignAgenticArchitectureZoneOne/.env` → `ZONE1_CAPABILITY_SERVER_URL`
- `NHS_Edge_App/ui/vite.config.js` → proxy target

## 5. Keycloak token lifespan

If you see token expiry errors after ~5 minutes, run this once after Zone 2 is up:

```powershell
$token = (Invoke-RestMethod -Uri "http://localhost:8080/realms/master/protocol/openid-connect/token" `
  -Method Post -Body @{ client_id="admin-cli"; username="admin"; password="admin"; grant_type="password" }).access_token

Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/sovereign" `
  -Method Put -Headers @{ Authorization="Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"accessTokenLifespan":3600}'
```
