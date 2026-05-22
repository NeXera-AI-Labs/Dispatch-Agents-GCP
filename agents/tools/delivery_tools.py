from langchain_core.tools import tool
from tools.odata_client import ODataClient


_client = ODataClient()


@tool
def list_open_deliveries() -> str:
    """List all open outbound deliveries from EWM."""
    try:
        data = _client.get("/odata/v4/ewm/OutboundDeliveries", {"$top": "50"})
        deliveries = data.get("value", [])
        if not deliveries:
            return "No open deliveries found."
        lines = [f"- {d['DeliveryDocument']} | Ship-To: {d.get('ShipToParty','?')} | Route: {d.get('ActualDeliveryRoute','?')}" for d in deliveries]
        return f"{len(deliveries)} open deliveries:\n" + "\n".join(lines)
    except Exception as e:
        return f"Error fetching deliveries: {e}"


@tool
def list_unassigned_deliveries() -> str:
    """List open deliveries with no driver assigned."""
    try:
        data = _client.get("/odata/v4/ewm/OutboundDeliveries", {"$top": "50"})
        deliveries = [d for d in data.get("value", []) if not d.get("DriverMobile")]
        if not deliveries:
            return "All deliveries have drivers assigned."
        lines = [f"- {d['DeliveryDocument']} | Ship-To: {d.get('ShipToParty','?')} | Date: {d.get('DeliveryDate','?')}" for d in deliveries]
        return f"{len(deliveries)} unassigned deliveries:\n" + "\n".join(lines)
    except Exception as e:
        return f"Error fetching unassigned deliveries: {e}"


@tool
def get_delivery_items(delivery_doc: str) -> str:
    """Get line items for a specific delivery. Pass the DeliveryDocument number from list_open_deliveries()."""
    data = _client.post("/odata/v4/ewm/getDeliveryItems", {"deliveryDoc": delivery_doc})
    items = data.get("value", [])
    if not items:
        return f"No items found for delivery {delivery_doc}."
    lines = [f"- {i.get('Material','?')} | Qty: {i.get('DeliveryQuantity','?')} {i.get('DeliveryQuantityUnit','')}" for i in items]
    return f"Items for {delivery_doc}:\n" + "\n".join(lines)


@tool
def get_delivery_route(delivery_doc: str) -> str:
    """Fetch Google Maps route for a delivery. Pass the DeliveryDocument number from list_open_deliveries()."""
    try:
        data = _client.post("/odata/v4/ewm/getDeliveryRoute", {"deliveryDoc": delivery_doc})
    except Exception as e:
        return f"Could not get route for {delivery_doc}: {e}"
    if not data:
        return f"No route found for delivery {delivery_doc}."
    return f"Route for {delivery_doc}: {data.get('origin','?')} → {data.get('destination','?')} | Distance: {data.get('distance','?')} | Duration: {data.get('duration','?')}"


@tool
def get_delivery_assignment(delivery_doc: str) -> str:
    """Get driver assignment and tracking status for a delivery document number.
    Returns driver name, mobile, truck, assignment status (ASSIGNED/IN_TRANSIT/DELIVERED), and last GPS."""
    try:
        data = _client.get(
            "/odata/v4/tracking/DriverAssignment",
            {"$filter": f"DeliveryDocument eq '{delivery_doc}'", "$orderby": "AssignedAt desc", "$top": "1"}
        )
        assignments = data.get("value", [])
        if not assignments:
            return f"No driver assignment found for delivery {delivery_doc}."
        a = assignments[0]
        status = a.get('Status', '?')
        lines = [
            f"Delivery: {delivery_doc}",
            f"Driver: {a.get('DriverName', '?')} | Mobile: {a.get('MobileNumber', '?')}",
            f"Truck: {a.get('TruckRegistration', '?')}",
            f"Status: {status}",
            f"Assigned At: {a.get('AssignedAt', '?')}",
        ]
        if a.get('CurrentLat'):
            lines.append(f"Last GPS: {a.get('CurrentLat')}, {a.get('CurrentLng')} | Updated: {a.get('LastGpsAt', '?')}")
        if status == 'DELIVERED':
            lines.append(f"Delivered At: {a.get('DeliveredAt', '?')}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error fetching assignment for {delivery_doc}: {e}"
