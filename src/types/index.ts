export interface ModelFile {
  id: string;
  name: string;
  type: '3mf' | 'stl' | 'unknown';
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface ModelDimensions {
  width: number;  // X轴尺寸
  height: number; // Y轴尺寸
  depth: number;  // Z轴尺寸
  volume: number; // 体积（估算）
  surfaceArea: number; // 表面积
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

export interface ModelStats {
  vertices: number;
  faces: number;
  triangles: number;
  edges: number;
}

export interface ModelGeometry {
  position: Float32Array;
  normal: Float32Array;
  index: Uint32Array | null;
}

export interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export interface CameraState {
  position: [number, number, number];
  rotation: [number, number, number];
  zoom: number;
}

export interface ViewSettings {
  showGrid: boolean;
  showAxes: boolean;
  showBoundingBox: boolean;
  showWireframe: boolean;
  showNormals: boolean;
  lighting: 'default' | 'studio' | 'outdoor';
  background: 'light' | 'dark' | 'gradient';
}

export interface UnitSystem {
  length: 'mm' | 'cm' | 'm' | 'inch';
  volume: 'mm³' | 'cm³' | 'm³' | 'inch³';
}

export type FileParserResult = {
  success: boolean;
  geometry?: ModelGeometry;
  dimensions?: ModelDimensions;
  stats?: ModelStats;
  error?: string;
};

export type ModelViewerState = {
  file: ModelFile | null;
  dimensions: ModelDimensions | null;
  stats: ModelStats | null;
  viewSettings: ViewSettings;
  unitSystem: UnitSystem;
  isLoading: boolean;
  error: string | null;
};