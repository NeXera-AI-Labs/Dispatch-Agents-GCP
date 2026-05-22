export type Role = 'it_admin' | 'wh_manager' | 'dispatcher' | 'supervisor';

export interface AuthUser {
  user_id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: Role;
  warehouse_numbers: string[];
}

export interface AuthResponse {
  token: string;
  tenant_id: string;
  user_id: string;
  role: Role;
  warehouse_numbers?: string[];
}

export interface InviteDetails {
  valid: boolean;
  email: string;
  role: Role | '';
  warehouse_number: string;
  tenant_id: string;
}

export interface Connection {
  id: string;
  name: string;
  erp_type: string;
  auth_type: string;
  base_url: string;
  status: string;
}

export interface Warehouse {
  id: string;
  warehouse_number: string;
  name: string;
  connection_id: string;
  physical_address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  working_hours_start?: string;
  working_hours_end?: string;
  working_days?: string;
}

export interface TenantSettings {
  gemini_api_key?: string;
  teams_webhook_url?: string;
  google_maps_key?: string;
}

// Matches actual SAP OData fields returned by cap-srv EwmService
export interface Delivery {
  DeliveryDocument: string;
  ActualDeliveryRoute?: string;
  ShippingPoint?: string;
  ShipToParty?: string;
  SalesOrganization?: string;
  ShippingCondition?: string;
  HeaderGrossWeight?: number;
  HeaderNetWeight?: number;
  HdrGoodsMvtIncompletionStatus?: string; // 'C' = complete
  HeaderBillgIncompletionStatus?: string;
  DeliveryDate?: string;
  // From tracking service (may be enriched later)
  driver_name?: string;
  driver_mobile?: string;
  qr_token?: string;
}

export interface DeliveryItem {
  DeliveryDocument: string;
  DeliveryDocumentItem: string;
  Material?: string;
  ActualDeliveryQuantity?: number;
  DeliveryQuantityUnit?: string;
  StorageLocation?: string;
}

export interface RouteStep {
  stepNumber: number;
  instruction: string;
  distance: string;
  duration: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  maneuver: string;
}

export interface RouteDirections {
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  bounds_northeast_lat: number;
  bounds_northeast_lng: number;
  bounds_southwest_lat: number;
  bounds_southwest_lng: number;
  rawData: string;
  steps: RouteStep[];
}

export interface DriverAssignment {
  ID: string;
  DeliveryDocument: string;
  MobileNumber: string;
  DriverName: string;
  TruckRegistration: string;
  Status: 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';
  AssignedAt: string;
  DeliveredAt?: string;
  CurrentLat?: number;
  CurrentLng?: number;
  LastGpsAt?: string;
  EstimatedDistance?: string;
  EstimatedDuration?: string;
  QRCodeUrl?: string;
  QRCodeImage?: string;
}
