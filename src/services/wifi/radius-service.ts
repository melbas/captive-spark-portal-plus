
import { RadiusClient, RadiusAuthLog, RadiusAccountingLog } from '@/components/wifi-portal/types';
import { v4 as uuidv4 } from 'uuid';

// Mock data since we don't have the actual tables in the database yet
const mockRadiusClients: RadiusClient[] = [
  {
    id: "1",
    name: "Main Access Point",
    shortname: "main-ap",
    nastype: "mikrotik",
    secret: "radiussecret",
    ipAddress: "192.168.1.1",
    description: "Main office access point",
    isActive: true
  },
  {
    id: "2",
    name: "Guest Network",
    shortname: "guest-wifi",
    nastype: "openwrt",
    secret: "guestsecret",
    ipAddress: "192.168.2.1",
    description: "Guest WiFi network",
    isActive: true
  }
];

const mockRadiusAuthLogs: RadiusAuthLog[] = [
  {
    id: "1",
    username: "user1",
    nasipaddress: "192.168.1.1",
    nasportid: "1",
    authDate: new Date().toISOString(),
    authStatus: "accept"
  },
  {
    id: "2",
    username: "user2",
    nasipaddress: "192.168.1.1",
    nasportid: "2",
    authDate: new Date(Date.now() - 3600000).toISOString(),
    authStatus: "reject",
    failureReason: "Invalid password"
  }
];

const mockRadiusAccountingLogs: RadiusAccountingLog[] = [
  {
    id: "1",
    username: "user1",
    acctSessionId: "sess-001",
    acctSessionTime: 3600,
    acctInputOctets: 1024000,
    acctOutputOctets: 2048000,
    nasipaddress: "192.168.1.1",
    startTime: new Date(Date.now() - 3600000).toISOString(),
    stopTime: new Date().toISOString(),
    terminationCause: "User-Request"
  }
];

// RADIUS client service
export const radiusService = {
  // Get all RADIUS clients
  getClients: async (): Promise<RadiusClient[]> => {
    // Mock implementation - returns the mock data
    console.log('Getting RADIUS clients');
    return mockRadiusClients;
  },

  // Get a specific RADIUS client
  getClient: async (id: string): Promise<RadiusClient | null> => {
    console.log(`Getting RADIUS client with ID: ${id}`);
    const client = mockRadiusClients.find(c => c.id === id);
    return client || null;
  },

  // Create a new RADIUS client
  createClient: async (clientData: Omit<RadiusClient, 'id'>): Promise<RadiusClient> => {
    console.log('Creating new RADIUS client', clientData);
    const newClient = {
      id: uuidv4(),
      ...clientData
    };
    mockRadiusClients.push(newClient);
    return newClient;
  },

  // Update a RADIUS client
  updateClient: async (id: string, clientData: Partial<RadiusClient>): Promise<RadiusClient | null> => {
    console.log(`Updating RADIUS client with ID: ${id}`, clientData);
    const index = mockRadiusClients.findIndex(c => c.id === id);
    if (index !== -1) {
      mockRadiusClients[index] = {
        ...mockRadiusClients[index],
        ...clientData
      };
      return mockRadiusClients[index];
    }
    return null;
  },

  // Delete a RADIUS client
  deleteClient: async (id: string): Promise<boolean> => {
    console.log(`Deleting RADIUS client with ID: ${id}`);
    const initialLength = mockRadiusClients.length;
    const newClients = mockRadiusClients.filter(c => c.id !== id);
    const deleted = newClients.length < initialLength;
    if (deleted) {
      mockRadiusClients.length = 0;
      mockRadiusClients.push(...newClients);
    }
    return deleted;
  },

  // Get RADIUS authentication logs
  getAuthLogs: async (limit: number = 50): Promise<RadiusAuthLog[]> => {
    console.log(`Getting up to ${limit} RADIUS auth logs`);
    return mockRadiusAuthLogs.slice(0, limit);
  },

  // Get RADIUS accounting logs
  getAccountingLogs: async (limit: number = 50): Promise<RadiusAccountingLog[]> => {
    console.log(`Getting up to ${limit} RADIUS accounting logs`);
    return mockRadiusAccountingLogs.slice(0, limit);
  }
};
