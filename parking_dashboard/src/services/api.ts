import axios, { AxiosError } from "axios";
import type { ParkingEntry, SecurityIncident } from "../types/type";

const API_BASE_URL = "http://localhost:5000/api";

export const fetchParkingEntries = async (): Promise<ParkingEntry[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/parking_entries`);
    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to fetch parking entries: ${(error as AxiosError).message}`
    );
  }
};

export const fetchSecurityIncidents = async (): Promise<SecurityIncident[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/security_incidents`);
    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to fetch security incidents: ${(error as AxiosError).message}`
    );
  }
};
