import httpx
import hashlib
import re
from typing import Any, Dict

VT_BASE = "https://www.virustotal.com/api/v3"

def detect_ioc_type(ioc: str) -> str:
    ioc = ioc.strip()
    ip_pattern = r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$"
    hash_md5 = r"^[a-fA-F0-9]{32}$"
    hash_sha1 = r"^[a-fA-F0-9]{40}$"
    hash_sha256 = r"^[a-fA-F0-9]{64}$"
    url_pattern = r"^https?://"
    domain_pattern = r"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$"

    if re.match(ip_pattern, ioc): return "ip"
    if re.match(hash_md5, ioc) or re.match(hash_sha1, ioc) or re.match(hash_sha256, ioc): return "hash"
    if re.match(url_pattern, ioc): return "url"
    if re.match(domain_pattern, ioc): return "domain"
    return "unknown"

async def lookup_ip(api_key: str, ip: str) -> Dict[str, Any]:
    headers = {"x-apikey": api_key}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{VT_BASE}/ip_addresses/{ip}", headers=headers)
        r.raise_for_status()
        data = r.json().get("data", {}).get("attributes", {})

        relations_r = await client.get(f"{VT_BASE}/ip_addresses/{ip}/resolutions?limit=5", headers=headers)
        relations_data = []
        if relations_r.status_code == 200:
            relations_data = [x.get("attributes", {}) for x in relations_r.json().get("data", [])]

        stats = data.get("last_analysis_stats", {})
        malicious = stats.get("malicious", 0)
        total = sum(stats.values()) if stats else 0

        return {
            "ioc": ip,
            "type": "ip",
            "verdict": "malicious" if malicious >= 3 else "suspicious" if malicious >= 1 else "clean",
            "malicious_count": malicious,
            "total_engines": total,
            "country": data.get("country", "N/A"),
            "asn": data.get("asn", "N/A"),
            "as_owner": data.get("as_owner", "N/A"),
            "reputation": data.get("reputation", 0),
            "network": data.get("network", "N/A"),
            "tags": data.get("tags", []),
            "stats": stats,
            "last_analysis_results": dict(list({
                k: v for k, v in data.get("last_analysis_results", {}).items()
                if v.get("category") in ["malicious", "suspicious"]
            }.items())[:10]),
            "resolutions": relations_data,
            "last_modification_date": data.get("last_modification_date"),
        }

async def lookup_hash(api_key: str, file_hash: str) -> Dict[str, Any]:
    headers = {"x-apikey": api_key}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{VT_BASE}/files/{file_hash}", headers=headers)
        r.raise_for_status()
        data = r.json().get("data", {}).get("attributes", {})

        stats = data.get("last_analysis_stats", {})
        malicious = stats.get("malicious", 0)
        total = sum(stats.values()) if stats else 0

        return {
            "ioc": file_hash,
            "type": "hash",
            "verdict": "malicious" if malicious >= 3 else "suspicious" if malicious >= 1 else "clean",
            "malicious_count": malicious,
            "total_engines": total,
            "file_name": data.get("meaningful_name", "N/A"),
            "file_type": data.get("type_description", "N/A"),
            "file_size": data.get("size", 0),
            "md5": data.get("md5", ""),
            "sha1": data.get("sha1", ""),
            "sha256": data.get("sha256", ""),
            "magic": data.get("magic", ""),
            "tags": data.get("tags", []),
            "stats": stats,
            "last_analysis_results": dict(list({
                k: v for k, v in data.get("last_analysis_results", {}).items()
                if v.get("category") in ["malicious", "suspicious"]
            }.items())[:10]),
            "signature_info": data.get("signature_info", {}),
            "names": data.get("names", [])[:5],
            "first_seen": data.get("first_submission_date"),
            "last_seen": data.get("last_analysis_date"),
        }

async def lookup_domain(api_key: str, domain: str) -> Dict[str, Any]:
    headers = {"x-apikey": api_key}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{VT_BASE}/domains/{domain}", headers=headers)
        r.raise_for_status()
        data = r.json().get("data", {}).get("attributes", {})

        stats = data.get("last_analysis_stats", {})
        malicious = stats.get("malicious", 0)
        total = sum(stats.values()) if stats else 0

        return {
            "ioc": domain,
            "type": "domain",
            "verdict": "malicious" if malicious >= 3 else "suspicious" if malicious >= 1 else "clean",
            "malicious_count": malicious,
            "total_engines": total,
            "registrar": data.get("registrar", "N/A"),
            "creation_date": data.get("creation_date"),
            "reputation": data.get("reputation", 0),
            "categories": data.get("categories", {}),
            "tags": data.get("tags", []),
            "stats": stats,
            "last_analysis_results": dict(list({
                k: v for k, v in data.get("last_analysis_results", {}).items()
                if v.get("category") in ["malicious", "suspicious"]
            }.items())[:10]),
            "whois": data.get("whois", "")[:500] if data.get("whois") else "",
        }

async def lookup_url(api_key: str, url: str) -> Dict[str, Any]:
    import base64
    headers = {"x-apikey": api_key}
    url_id = base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{VT_BASE}/urls/{url_id}", headers=headers)
        r.raise_for_status()
        data = r.json().get("data", {}).get("attributes", {})

        stats = data.get("last_analysis_stats", {})
        malicious = stats.get("malicious", 0)
        total = sum(stats.values()) if stats else 0

        return {
            "ioc": url,
            "type": "url",
            "verdict": "malicious" if malicious >= 3 else "suspicious" if malicious >= 1 else "clean",
            "malicious_count": malicious,
            "total_engines": total,
            "final_url": data.get("last_final_url", url),
            "title": data.get("title", "N/A"),
            "stats": stats,
            "categories": data.get("categories", {}),
            "last_analysis_results": dict(list({
                k: v for k, v in data.get("last_analysis_results", {}).items()
                if v.get("category") in ["malicious", "suspicious"]
            }.items())[:10]),
            "last_http_response_code": data.get("last_http_response_code"),
        }

async def lookup_ioc(api_key: str, ioc: str) -> Dict[str, Any]:
    ioc_type = detect_ioc_type(ioc)
    try:
        if ioc_type == "ip": return await lookup_ip(api_key, ioc)
        elif ioc_type == "hash": return await lookup_hash(api_key, ioc)
        elif ioc_type == "domain": return await lookup_domain(api_key, ioc)
        elif ioc_type == "url": return await lookup_url(api_key, ioc)
        else: return {"ioc": ioc, "type": "unknown", "verdict": "unknown", "error": "Unrecognised IOC type"}
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return {"ioc": ioc, "type": ioc_type, "verdict": "not_found", "error": "Not found in VirusTotal"}
        return {"ioc": ioc, "type": ioc_type, "verdict": "error", "error": str(e)}
    except Exception as e:
        return {"ioc": ioc, "type": ioc_type, "verdict": "error", "error": str(e)}
