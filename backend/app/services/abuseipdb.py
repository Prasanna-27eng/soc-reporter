import httpx
from typing import Any, Dict

ABUSE_BASE = "https://api.abuseipdb.com/api/v2"

async def check_ip(api_key: str, ip: str) -> Dict[str, Any]:
    headers = {"Key": api_key, "Accept": "application/json"}
    params = {"ipAddress": ip, "maxAgeInDays": 90, "verbose": True}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{ABUSE_BASE}/check", headers=headers, params=params)
            r.raise_for_status()
            data = r.json().get("data", {})
            return {
                "ip": ip,
                "abuse_confidence_score": data.get("abuseConfidenceScore", 0),
                "total_reports": data.get("totalReports", 0),
                "num_distinct_users": data.get("numDistinctUsers", 0),
                "country_code": data.get("countryCode", "N/A"),
                "isp": data.get("isp", "N/A"),
                "domain": data.get("domain", "N/A"),
                "is_tor": data.get("isTor", False),
                "is_whitelisted": data.get("isWhitelisted", False),
                "usage_type": data.get("usageType", "N/A"),
                "last_reported_at": data.get("lastReportedAt"),
                "reports": data.get("reports", [])[:5],
            }
    except Exception as e:
        return {"ip": ip, "error": str(e)}
