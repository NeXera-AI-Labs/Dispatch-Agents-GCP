import httpx
from urllib.parse import quote
from config import settings


def _build_odata_query(params: dict) -> str:
    # Keep $ unencoded in both keys and values (OData system query options)
    parts = []
    for k, v in params.items():
        encoded_v = quote(str(v), safe="$,'")
        parts.append(f"{k}={encoded_v}")
    return "&".join(parts)


class ODataClient:
    def get(self, path: str, params: dict | None = None) -> dict:
        url = f"{settings.cap_base_url}{path}"
        if params:
            url = f"{url}?{_build_odata_query(params)}"
        resp = httpx.get(url, timeout=15)
        resp.raise_for_status()
        return resp.json()
        resp.raise_for_status()
        return resp.json()

    def post(self, path: str, body: dict) -> dict:
        resp = httpx.post(
            f"{settings.cap_base_url}{path}",
            json=body,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    def patch(self, path: str, body: dict) -> dict:
        resp = httpx.patch(
            f"{settings.cap_base_url}{path}",
            json=body,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    def post(self, path: str, body: dict) -> dict:
        resp = httpx.post(
            f"{settings.cap_base_url}{path}",
            json=body,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    def patch(self, path: str, body: dict) -> dict:
        resp = httpx.patch(
            f"{settings.cap_base_url}{path}",
            json=body,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
