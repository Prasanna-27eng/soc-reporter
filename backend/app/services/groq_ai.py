import httpx
import json
from typing import Any, Dict, List

GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

async def call_groq(api_key: str, messages: list, temperature: float = 0.3, max_tokens: int = 4096) -> str:
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=90) as client:
        r = await client.post(GROQ_BASE, headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()

async def generate_ai_summary(api_key: str, case_data: Dict) -> Dict[str, Any]:
    iocs = case_data.get("iocs", [])
    timeline = case_data.get("timeline_events", [])

    context = f"""
============================
INCIDENT CASE DETAILS
============================
Case Number  : {case_data.get('case_number', 'N/A')}
Title        : {case_data.get('title', 'N/A')}
Incident Type: {case_data.get('incident_type', 'N/A')}
Severity     : {case_data.get('severity', 'N/A')}
Status       : {case_data.get('status', 'N/A')}
Analyst      : {case_data.get('analyst_name', 'N/A')}
Customer     : {case_data.get('customer_name', 'N/A')}
Affected Systems: {case_data.get('affected_systems', 'N/A')}

INCIDENT DESCRIPTION:
{case_data.get('description', 'No description provided.')}

COMMANDS RUN DURING INVESTIGATION:
{case_data.get('commands_run', 'No commands recorded.')}

ANALYST FINDINGS:
{case_data.get('findings', 'No findings recorded.')}

INDICATORS OF COMPROMISE (IOCs):
{chr(10).join([f"  - {ioc}" for ioc in iocs]) if iocs else '  None identified'}

ATTACK TIMELINE:
{chr(10).join([f"  - {e}" for e in timeline]) if timeline else '  Not provided'}
============================
"""

    # ── Executive Summary ──────────────────────────────────────────────────
    exec_msgs = [
        {
            "role": "system",
            "content": (
                "You are a senior SOC analyst and incident report writer at a top cybersecurity firm. "
                "You write detailed, professional incident reports used for executive briefings and customer deliverables. "
                "Your writing is clear, structured, and authoritative. Never use bullet points in the executive summary — write full paragraphs."
            )
        },
        {
            "role": "user",
            "content": f"""Write a DETAILED executive summary for the following security incident. This will be presented directly to the customer's management team.

Your executive summary MUST include all of the following sections, written as full professional paragraphs (not bullet points):

1. INCIDENT OVERVIEW — What happened, when it was detected, and how it was identified. Include the incident type, severity level, and a clear description of the threat.

2. BUSINESS IMPACT — What systems, data, or operations were affected or at risk. Describe the potential consequences if the incident had not been contained.

3. ATTACK SUMMARY — A clear explanation of what the attacker did or attempted to do, in language a non-technical executive can understand. Reference specific findings and IOCs where relevant.

4. INVESTIGATION ACTIONS — What the SOC analyst investigated, what tools and commands were used, and what was discovered. Be specific.

5. CURRENT STATUS & CONTAINMENT — Whether the threat has been contained or is ongoing, and what immediate actions have been taken.

6. NEXT STEPS — What the organisation must do immediately, in the short term, and ongoing to prevent recurrence.

Write at minimum 400 words. Be specific, detailed, and professional. Use formal language appropriate for a board-level audience.

{context}"""
        }
    ]

    # ── Technical Summary ──────────────────────────────────────────────────
    tech_msgs = [
        {
            "role": "system",
            "content": (
                "You are a SOC L3 analyst writing a technical incident report for the security team. "
                "Use precise technical language, reference specific tools, techniques, and evidence. "
                "Structure your analysis clearly with headings. Be exhaustive and detailed."
            )
        },
        {
            "role": "user",
            "content": f"""Write a DETAILED technical analysis for the following security incident. This will be read by the customer's security team and used for forensic documentation.

Your technical analysis MUST cover all of the following sections with full detail:

1. INITIAL DETECTION & TRIAGE — How the alert was triggered, initial indicators, and triage steps taken. Reference specific event IDs, log sources, or detection rules if available.

2. ATTACK VECTOR & INITIAL ACCESS — How the attacker gained or attempted to gain access. Reference specific techniques (with MITRE ATT&CK IDs where applicable).

3. FORENSIC EVIDENCE — Detailed breakdown of IOCs found (IPs, hashes, domains). Describe what each IOC indicates. Reference any VirusTotal results, behavioural patterns, or correlation data.

4. ATTACK PROGRESSION (KILL CHAIN) — Step-by-step technical breakdown of the attacker's actions. Map each stage to the Cyber Kill Chain and MITRE ATT&CK framework.

5. AFFECTED SYSTEMS & SCOPE — Detailed technical description of what systems, accounts, or data were accessed, modified, or exfiltrated. Include lateral movement if applicable.

6. TOOLS & COMMANDS USED IN INVESTIGATION — Document all investigation commands, what they revealed, and the analyst's interpretation of results.

7. MALWARE / THREAT ACTOR BEHAVIOUR — If malware is involved, describe its behaviour, persistence mechanisms, C2 communication, and evasion techniques observed.

8. REMEDIATION & HARDENING STEPS — Specific, technical remediation steps with commands or configurations where appropriate. Prioritise by urgency.

Write at minimum 600 words. Be exhaustive. Include technical specifics. This is a forensic document.

{context}"""
        }
    ]

    # ── MITRE Mapping ──────────────────────────────────────────────────────
    mitre_msgs = [
        {
            "role": "system",
            "content": "You are a threat intelligence analyst and MITRE ATT&CK expert. Return ONLY valid JSON. No markdown, no explanation, no code blocks."
        },
        {
            "role": "user",
            "content": f"""Analyse this incident and map ALL relevant observed or suspected behaviours to MITRE ATT&CK techniques.

Return a JSON array. Each item must have exactly these fields:
- technique_id: string (e.g. "T1566.001")
- technique_name: string (e.g. "Spearphishing Attachment")
- tactic: string (e.g. "Initial Access")
- evidence: string (specific evidence from the case that maps to this technique, minimum 20 words)

Include at minimum 5 techniques if the evidence supports it. Map every finding, IOC, and command to the most specific technique possible.

Return ONLY the JSON array. No other text. No markdown.

{context}"""
        }
    ]

    # ── Severity Score ─────────────────────────────────────────────────────
    severity_msgs = [
        {
            "role": "system",
            "content": "You are a SOC analyst calculating incident severity. Return ONLY valid JSON. No markdown, no explanation."
        },
        {
            "role": "user",
            "content": f"""Calculate a severity risk score for this security incident.

Return a JSON object with exactly these fields:
- score: integer between 1 and 100
- recommended_severity: string, one of "Critical", "High", "Medium", "Low"
- reasoning: string, minimum 80 words explaining the score based on: threat type, IOC reputation, affected systems, potential data exposure, attacker capability, and blast radius

Return ONLY the JSON object. No other text.

{context}"""
        }
    ]

    # ── Recommendations ────────────────────────────────────────────────────
    rec_msgs = [
        {
            "role": "system",
            "content": "You are a senior SOC analyst writing actionable security recommendations. Be specific, technical, and prioritised."
        },
        {
            "role": "user",
            "content": f"""Write detailed, prioritised remediation and hardening recommendations for this incident.

Structure your response as follows:

IMMEDIATE ACTIONS (within 24 hours):
- List 3-4 urgent containment and eradication steps with specific technical details

SHORT-TERM ACTIONS (within 7 days):
- List 3-4 remediation steps including patching, hardening, and investigation

LONG-TERM IMPROVEMENTS (within 30 days):
- List 3-4 strategic security improvements to prevent recurrence

For each recommendation, explain WHY it is needed based on the specific findings in this case. Be technical and specific — include tool names, commands, or configuration changes where helpful.

{context}"""
        }
    ]

    # Run all in sequence (Groq free tier: sequential is safest for rate limits)
    exec_summary = await call_groq(api_key, exec_msgs, temperature=0.3, max_tokens=4096)
    tech_summary = await call_groq(api_key, tech_msgs, temperature=0.2, max_tokens=4096)

    mitre_raw = await call_groq(api_key, mitre_msgs, temperature=0.1, max_tokens=2048)
    try:
        start = mitre_raw.find("[")
        end = mitre_raw.rfind("]") + 1
        mitre_techniques = json.loads(mitre_raw[start:end]) if start != -1 else []
    except Exception:
        mitre_techniques = []

    severity_raw = await call_groq(api_key, severity_msgs, temperature=0.1, max_tokens=512)
    try:
        start = severity_raw.find("{")
        end = severity_raw.rfind("}") + 1
        severity_data = json.loads(severity_raw[start:end]) if start != -1 else {}
    except Exception:
        severity_data = {}

    recommendations = await call_groq(api_key, rec_msgs, temperature=0.3, max_tokens=2048)

    return {
        "executive_summary": exec_summary,
        "technical_summary": tech_summary,
        "mitre_techniques": mitre_techniques,
        "severity_score": severity_data.get("score", 50),
        "severity_reasoning": severity_data.get("reasoning", ""),
        "recommended_severity": severity_data.get("recommended_severity", "Medium"),
        "recommendations": recommendations,
    }

async def explain_sandbox_output(api_key: str, sandbox_text: str) -> Dict[str, Any]:
    msgs = [
        {
            "role": "system",
            "content": "You are a malware analyst. Analyse sandbox output and explain malware behaviour clearly and thoroughly."
        },
        {
            "role": "user",
            "content": f"""Analyse the following sandbox/behaviour report output and provide a DETAILED malware analysis.

Your response MUST include:

1. MALWARE BEHAVIOUR SUMMARY — Plain English explanation of what this malware does, written for both technical and non-technical readers.

2. CAPABILITIES OBSERVED — List all capabilities: persistence, lateral movement, data exfiltration, C2 communication, evasion, privilege escalation, etc. For each capability, cite the specific evidence from the sandbox output.

3. MITRE ATT&CK MAPPING — Map every observed behaviour to specific MITRE ATT&CK technique IDs and names.

4. INDICATORS OF COMPROMISE — Extract all IOCs from the output: IPs, domains, file hashes, registry keys, file paths, mutexes, named pipes.

5. THREAT ASSESSMENT — How dangerous is this? What is its likely purpose (ransomware, RAT, infostealer, dropper, etc.)? Known malware family if identifiable.

6. CONTAINMENT & REMEDIATION — Specific steps to contain and remove this threat from an affected system.

Be thorough and technical. Minimum 500 words.

SANDBOX OUTPUT:
{sandbox_text}"""
        }
    ]
    result = await call_groq(api_key, msgs, temperature=0.2, max_tokens=4096)
    return {"analysis": result}

async def generate_yara_rule(api_key: str, iocs: list, context: str) -> str:
    ioc_list = "\n".join([f"  - {ioc}" for ioc in iocs])
    msgs = [
        {
            "role": "system",
            "content": "You are a malware researcher expert in YARA rule writing. Write production-quality YARA rules with full comments."
        },
        {
            "role": "user",
            "content": f"""Write a production-ready YARA rule based on the following IOCs and incident context.

The YARA rule MUST:
- Have a descriptive rule name and metadata (author, date, description, severity, reference)
- Include string patterns derived from the IOCs (file hashes as condition, domain/IP strings, suspicious patterns)
- Have a well-commented condition block explaining the logic
- Include a second broader hunting rule variant with lower confidence but higher coverage
- Add inline comments explaining what each string or condition detects

IOCs:
{ioc_list}

Incident Context:
{context}

Output the complete YARA rule(s) ready to deploy. Include usage instructions as a comment."""
        }
    ]
    return await call_groq(api_key, msgs, temperature=0.2, max_tokens=2048)

async def decode_and_explain(api_key: str, encoded_string: str, encoding_type: str) -> str:
    msgs = [
        {
            "role": "system",
            "content": "You are a malware analyst specialising in deobfuscation and encoded payload analysis."
        },
        {
            "role": "user",
            "content": f"""Analyse this {encoding_type} encoded string found during a security investigation.

1. DECODED CONTENT — Show the decoded output clearly
2. WHAT IT DOES — Explain exactly what this code/string does in plain English
3. THREAT ASSESSMENT — Is this malicious? What is its purpose?
4. MITRE ATT&CK — What technique does this represent?
5. IOCs EXTRACTED — List any IPs, domains, hashes, or file paths found in the decoded content

Encoded string:
{encoded_string}"""
        }
    ]
    return await call_groq(api_key, msgs, temperature=0.2, max_tokens=2048)
