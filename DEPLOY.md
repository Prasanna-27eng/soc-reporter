# SOC Report Automator — Deploy Guide
## You will have a live URL in under 10 minutes. Free forever.

---

## What You Need Before Starting
- GitHub account (free) → github.com
- Railway account (free) → railway.app — sign up with GitHub
- Your API keys (already in .env):
  - VirusTotal ✓
  - Groq ✓

---

## Step 1 — Push to GitHub

Open your terminal and run these commands from inside the `soc-reporter` folder:

```bash
cd "soc-reporter"
git init
git add .
git commit -m "Initial commit — SOC Report Automator"
```

Then go to github.com → New Repository → name it `soc-reporter` → Create.

Copy the two commands GitHub shows you (they look like):
```bash
git remote add origin https://github.com/YOUR_USERNAME/soc-reporter.git
git push -u origin main
```

---

## Step 2 — Deploy on Railway

1. Go to **railway.app** and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `soc-reporter` repository
4. Railway detects the `Dockerfile` automatically — click **Deploy**

---

## Step 3 — Add Your API Keys as Environment Variables

In Railway, click your service → **Variables** tab → add each one:

| Variable | Value |
|---|---|
| `VIRUSTOTAL_API_KEY` | your_virustotal_key_here |
| `GROQ_API_KEY` | your_groq_key_here |
| `SECRET_KEY` | pick-any-long-random-string-eg-soc2026prasannasecret |

Railway will redeploy automatically after you add variables.

---

## Step 4 — Get Your URL

Railway assigns a public URL like:
```
https://soc-reporter-production-xxxx.up.railway.app
```

Open it in any browser. You'll see the SOC Reporter login page.

**First time:** Click Register and create your account. This is your private analyst account.

---

## Step 5 — Add a Persistent Volume (keeps your cases safe)

By default Railway resets the filesystem on redeploy. To keep your cases permanently:

1. In Railway → your service → **Volumes** tab
2. Add volume: Mount path `/app` — this persists your SQLite database

---

## Done. Your app is live.

---

## How to Use the App

### Create a Case
1. Cases → New Case
2. Select a template (Ransomware, Phishing, BEC, etc.) — auto-fills severity and description
3. Fill in affected systems, analyst name, customer name
4. Click Create Case

### Investigate
Inside the case, use the tabs:
- **Overview** — case metadata
- **Investigation** — paste commands you ran + findings
- **IOCs** — add IOCs, they auto-lookup in VirusTotal. Click "Add + Lookup"
- **Timeline** — add events as you discover them (timestamps auto-added)
- **Playbook** — step-by-step investigation checklist for the incident type
- **AI Analysis** — click "Generate AI" for executive summary, technical analysis, MITRE mapping, severity score
- **AI Chat** — ask the AI questions about your case
- **Report** — download PDF or DOCX

### VirusTotal Lookup (dedicated tab)
- Paste any IP, hash (MD5/SHA1/SHA256), domain, or URL
- Full verdict + detections + flagged engines shown
- "Push to Case" sends the finding to any open case
- "IOC Extractor" tab: paste raw logs/emails, it extracts all IOCs automatically

### Malware Tools
- **String Decoder** — decode Base64, Hex, URL, ROT13, XOR (paste obfuscated PowerShell)
- **Sandbox Explainer** — paste AnyRun/Hybrid Analysis output, AI explains the malware behaviour
- **YARA Generator** — paste IOCs, AI writes a deployable YARA rule (.yar download)

---

## Troubleshooting

**App loads but AI doesn't work**
→ Check GROQ_API_KEY is set correctly in Railway Variables

**VT returns errors**
→ Check VIRUSTOTAL_API_KEY in Railway Variables. Free tier = 4 lookups/min

**Cases disappear after redeploy**
→ Add a Railway Volume at `/app` (Step 5 above)

**Build fails**
→ Check Railway build logs. Most common issue is node_modules — the Dockerfile handles this

---

## Free Tier Limits

| Service | Free Limit |
|---|---|
| Railway | $5 credit/month (enough for always-on personal tool) |
| VirusTotal | 4 lookups/min, 500/day |
| Groq | 14,400 AI requests/day, 30 requests/min |
| NVD (CVE) | Unlimited, no key needed |

---

## Keeping API Keys Safe

The `.env` file in this repo contains your real keys. Before making the GitHub repo **public**:
1. Delete the `.env` file from the repo
2. Only use Railway Environment Variables (already done in Step 3)
3. Add `.env` to `.gitignore`

If repo stays **private**, you're fine as-is.
