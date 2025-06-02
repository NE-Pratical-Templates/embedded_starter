// Types
export interface ParkingEntry {
  id: number;
  entry_time: string;
  exit_time: string | null;
  car_plate: string;
  due_payment: number | null;
  payment_status: boolean;
}

export interface SecurityIncident {
  id: number;
  car_plate: string;
  incident_type: string;
  incident_time: string;
  description: string;
  resolved: boolean;
  resolution_notes: string | null;
  additional_info: string | null;
}
