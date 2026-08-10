// 1. The Base rules that EVERY message must follow
export interface BaseMessage {
  id: string;
  content: string;
  timestamp: Date;
  fileAttached?: string;
  status?: 'error' | 'sending' | 'sent';
}

// 2. The User Message (Simple)
export interface UserMessage extends BaseMessage {
  type: 'user';
}

export interface SpecialContentPayload {
  type: 'summary' | 'food' | 'videos' | 'hospitals' | 'facilities';
  data: Record<string, unknown>;
}

export interface Citation {
  id?: string | number;
  text?: string;
  source?: string;
  [key: string]: unknown;
}

// 3. The Bot Message (Complex, with all your future features!)
export interface BotMessage extends BaseMessage {
  type: 'bot';
  
  // Future Features (Only the bot sends these)
  sql?: string;
  video?: { title: string; url: string; };
  specialContent?: SpecialContentPayload; 
  anomalies?: string[];
  citations?: Citation[];
  mapData?: { 
    center: { lng: number; lat: number }; 
    markers: { lng: number; lat: number; label: string }[] 
  };
  agent_response?: {
    answer: string;
    stats: { label: string; value: number; severity: string }[];
    anomaly_warning: string | null;
    recommendation: string;
  };
  raw_data?: Record<string, unknown>[];
}

// 4. A general "Message" can be EITHER a User or Bot message
export type Message = UserMessage | BotMessage;

// 5. The full Chat history structure
export interface Chat {
  id: string;
  title: string;
  lastMessage: Date;
  messages: Message[];
  medicalContext?: {
    conditions: string[];
    medications: string[];
    concerns: string[];
  };
}