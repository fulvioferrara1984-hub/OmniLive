export type EventStatus = 'TBC' | 'Confirmed-In progress' | 'Confirmed-Ready for live' | 'Live' | 'Done';
export type EventType = 'Live Event' | 'POC';
export type LogActor = 'TGI' | 'Connectivity Provider' | 'Client' | 'Other';

export interface EventLog {
  id: string;
  timestamp: string; // ISO 8601
  actor: LogActor;
  message: string;
}

export type MachineType = 'Tracer' | 'Integrator' | 'Renderer';
export type SignalNomenclature = 'Acarpet/Carpet' | 'Atgi/Tgi';
export type Resolution = 'HD' | 'UHD';

export interface PortConfig {
  id: string;
  label: string;
  port: number;
}

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  isAvailable: boolean;
  notes?: string;
  linkedMachineIds?: string[]; // For constraints (e.g., this tracer must work with this integrator)
  matrix: 'Matrix 1' | 'Matrix 2';
  resolution: Resolution[];
  supportsMulticam?: boolean;
  instances?: number; // Number of outputs/instances (e.g., Renderer can have 2)
  inputs?: PortConfig[];
  outputs?: PortConfig[];
}

export interface Infrastructure {
  id: string;
  tielines: {
    m1ToM2: number;
    m2ToM1: number;
  };
  matrixNames: {
    m1: string;
    m2: string;
  };
  splittingRules: {
    startPort: number;
    endPort: number;
    matrix: 'Matrix 1' | 'Matrix 2';
  };
}

export interface System {
  id: string;
  name: string;
  signalNomenclature: SignalNomenclature;
  videoMatrix: 'Matrix 1' | 'Matrix 2'; // Primary matrix
  machineIds: string[]; // Legacy or all machines
  mainMachineIds?: string[];
  backupMachineIds?: string[];
  spareMachineIds?: string[];
  isAvailable: boolean;
  resolution: Resolution[];
}

export interface Gallery {
  id: string;
  name: string;
  resolution: Resolution[];
  videoMatrix?: 'Matrix 1' | 'Matrix 2' | 'Any';
  systemId?: string; // Link to a specific system if assigned
  mainConfig: {
    trackingType: 'Tracking 1' | 'Tracking 2';
    cameras: number;
    pgms: number;
    outputs: number;
  };
  hasBackup: boolean;
  redundantMatrix?: boolean; // Disaster Recovery
  uhdAssignment?: 'Multilateral' | 'Unilateral';
  backupConfig?: {
    trackingType: 'Tracking 1' | 'Tracking 2';
    cameras: number;
    pgms: number;
    outputs: number;
  } | null;
  virtualAssets?: string[];
  layoutPreview?: string;
}

export interface SignalsTransport {
  inputsCount: number;
  signalType: string;
  colorProfile: string;
  transportTypesMain: string[];
  transportTypesBck: string[];
  videoStandard: string;
  audioConfig: string;
  transportDetails: {
    id: string;
    type: string;
    primaryInfo: string;
    secondaryInfo: string;
    notes: string;
  }[];
  outputsCount: number;
  outputDelivery: string;
  outputTransportTypes: string[];
  notes: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  activity: string;
  notes: string;
}

export interface CostItem {
  id: string;
  description: string;
  amount: number;
}

export interface EventSession {
  id: string;
  title: string;
  teamA?: string;
  teamB?: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
}

export interface BroadcastEvent {
  id: string;
  title: string;
  competition?: string;
  teamA?: string;
  teamB?: string;
  description?: string;
  contacts?: string;
  sport?: string;
  venue?: string;
  city?: string;
  venueTimezone?: string;
  projectHubUrl?: string;
  signalsTransport?: SignalsTransport;
  schedule?: ScheduleItem[];
  costs?: CostItem[];
  galleries?: Gallery[];
  sessions?: EventSession[]; // For multi-day/tournaments with daily schedules
  logs?: EventLog[];
  status: EventStatus;
  type: EventType;
  startDate: string; // ISO 8601 (Overall start or single event start)
  endDate: string;   // ISO 8601 (Overall end or single event end)
  createdBy: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'production' | 'operator';
}
