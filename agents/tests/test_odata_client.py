import respx
import httpx
from unittest.mock import patch


@respx.mock
def test_get_fetches_odata():
    from tools.odata_client import ODataClient
    respx.get("https://srv.example.com/odata/v4/ewm/OutboundDeliveries").mock(
        return_value=httpx.Response(200, json={"value": [{"DeliveryDocument": "80000001"}]})
    )
    with patch("tools.odata_client.settings") as mock_settings:
        mock_settings.cap_base_url = "https://srv.example.com"
        client = ODataClient()
        result = client.get("/odata/v4/ewm/OutboundDeliveries")
        assert result["value"][0]["DeliveryDocument"] == "80000001"


@respx.mock
def test_post_sends_json_body():
    from tools.odata_client import ODataClient
    respx.post("https://srv.example.com/odata/v4/tracking/assignDriver").mock(
        return_value=httpx.Response(200, json={"ID": "abc"})
    )
    with patch("tools.odata_client.settings") as mock_settings:
        mock_settings.cap_base_url = "https://srv.example.com"
        client = ODataClient()
        result = client.post("/odata/v4/tracking/assignDriver", {"deliveryDoc": "80000001"})
        assert result["ID"] == "abc"


@respx.mock
def test_patch_sends_json_body():
    from tools.odata_client import ODataClient
    respx.patch("https://srv.example.com/odata/v4/tracking/Driver('123')").mock(
        return_value=httpx.Response(200, json={"ID": "123", "IsActive": True})
    )
    with patch("tools.odata_client.settings") as mock_settings:
        mock_settings.cap_base_url = "https://srv.example.com"
        client = ODataClient()
        result = client.patch("/odata/v4/tracking/Driver('123')", {"IsActive": True})
        assert result["ID"] == "123"
