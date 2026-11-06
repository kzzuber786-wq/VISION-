export type VisionMode = 'explore' | 'learn' | 'research';

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface DetectedEntity {
  id: string;
  name: string;
  category: string;
  confidence: number; // 0.0 - 1.0
  box?: BoundingBox; // normalized 0-1
  pixelBox?: { x: number; y: number; width: number; height: number };
  summary?: string;
  material?: string;
  workingPrinciple?: string;
  practicalUse?: string;
  curiousFact?: string;
  tags?: string[];
  color?: string;
  source?: 'local_coco' | 'gemini_vision';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface VisionAnalysisResult {
  sceneDescription: string;
  primarySubject: string;
  detectedItems: DetectedEntity[];
  visualAttributes?: {
    lighting?: string;
    environment?: string;
    composition?: string;
    dominantColors?: string[];
  };
  inferredContext?: string;
  suggestedQuestions: string[];
  groundingSources?: GroundingSource[];
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  groundingSources?: GroundingSource[];
  attachedObjectId?: string;
  audioUrl?: string;
  mode?: VisionMode;
}

export interface SavedDiscovery {
  id: string;
  title: string;
  category: string;
  timestamp: number;
  imageThumbnail?: string;
  sceneDescription: string;
  detectedCount: number;
  notes?: string;
  tags: string[];
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export type LiveVoiceStatus = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';
