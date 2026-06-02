import httpx
import asyncio
from typing import Any, Dict

URLSCAN_BASE = "https://urlscan.io/api/v1"

async def scan_url(api_key: str, url: str) -> Dict[str, Any]:
    headers = {"API-Key": api_key, "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Submit scan
            r = await client.post(f"{URLSCAN_BASE}/scan/", headers=headers, json={"url": url, "visibility": "private"})
            r.raise_for_status()
            scan_data = r.json()
            uuid = scan_data.get("uuid")
            if not uuid:
                return {"url": url, "error": "No scan UUID returned"}

            # Poll for result (max 30s)
            for _ in range(6):
                await asyncio.sleep(5)
                result_r = await client.get(f"{URLSCAN_BASE}/result/{uuid}/")
                if result_r.status_code == 200:
                    result = result_r.json()
                    page = result.get("page", {})
                    verdicts = result.get("verdicts", {})
                    return {
                        "url": url,
                        "uuid": uuid,
                        "screenshot": f"https://urlscan.io/screenshots/{uuid}.png",
                        "result_url": f"https://urlscan.io/result/{uuid}/",
                        "domain": page.get("domain", "N/A"),
                        "ip": page.get("ip", "N/A"),
                        "country": page.get("country", "N/A"),
                        "server": page.get("server", "N/A"),
                        "title": page.get("title", "N/A"),
                        "overall_verdict": verdicts.get("overall", {}).get("score", 0),
                        "malicious": verdicts.get("overall", {}).get("malicious", False),
                        "tags": verdicts.get("overall", {}).get("tags", []),
                        "categories": list(set([
                            cat for engine in verdicts.values() if isinstance(engine, dict)
                            for cat in engine.get("categories", [])
                        ])),
                    }
            return {"url": url, "uuid": uuid, "status": "pending", "result_url": f"https://urlscan.io/result/{uuid}/"}
    except Exception as e:
        return {"url": url, "error": str(e)}

async def search_domain(api_key: str, domain: str) -> Dict[str, Any]:
    headers = {"API-Key": api_key}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{URLSCAN_BASE}/search/?q=domain:{domain}&size=5", headers=headers)
            r.raise_for_status()
            results = r.json().get("results", [])
            return {
                "domain": domain,
                "total": r.json().get("total", 0),
                "results": [{
                    "uuid": x.get("_id"),
                    "url": x.get("page", {}).get("url", ""),
                    "domain": x.get("page", {}).get("domain", ""),
                    "ip": x.get("page", {}).get("ip", ""),
                    "malicious": x.get("verdicts", {}).get("overall", {}).get("malicious", False),
                    "screenshot": f"https://urlscan.io/screenshots/{x.get('_id')}.png",
                    "result_url": f"https://urlscan.io/result/{x.get('_id')}/",
                } for x in results[:5]]
            }
    except Exception as e:
        return {"domain": domain, "error": str(e)}
