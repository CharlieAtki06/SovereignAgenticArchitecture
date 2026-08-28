# Running the NHS Demo

## 1. Setup

Run the setup script once to clone all three repos:

```powershell
.\setup.ps1
```

## 2. Prerequisites

- [Podman Desktop](https://podman-desktop.io/) installed and running
- Python 3.11+
- Node.js 18+

## 3. Configure Zone 1

Copy the example env file and fill in your values:

```powershell
cd SovereignAgenticArchitectureZoneOne
cp .env.example .env
```

Then edit `.env`:

- **`ZONE1_MODEL`** — path to your GGUF model file. The fine-tuned NHS model is preferred; if you don't have it, any LLaMA 3.2 1B GGUF works as a fallback (e.g. from [bartowski/Llama-3.2-1B-Instruct-GGUF](https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF)).
- **`ZONE1_CAPABILITY_SERVER_URL`** — replace `<YOUR_WSL2_IP>` with your machine's WSL2 IP. Get it by running:
  ```powershell
  podman machine ssh "ip addr show eth0"
  ```

## 4. Install dependencies (first time only)

**Zone 1:**
```powershell
cd SovereignAgenticArchitectureZoneOne
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r runtime/requirements.txt
```

**UI:**
```powershell
cd NHS_Edge_App/ui
npm install
```

## 5. Start (three terminals)

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

## 6. Keycloak token lifespan (if tokens expire mid-session)

Run once after Zone 2 is up:

```powershell
$token = (Invoke-RestMethod -Uri "http://localhost:8080/realms/master/protocol/openid-connect/token" `
  -Method Post -Body @{ client_id="admin-cli"; username="admin"; password="admin"; grant_type="password" }).access_token

Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/sovereign" `
  -Method Put -Headers @{ Authorization="Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"accessTokenLifespan":3600}'
```
