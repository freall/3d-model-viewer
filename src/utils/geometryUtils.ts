import { Vector3, Box3, BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } from 'three';
import { ModelDimensions, ModelStats, ModelGeometry } from '../types';

/**
 * 计算几何体的边界框尺寸
 */
export function computeBoundingBox(geometry: ModelGeometry): { min: Vector3; max: Vector3; size: Vector3 } {
  const position = geometry.position;
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);

  for (let i = 0; i < position.length; i += 3) {
    const x = position[i];
    const y = position[i + 1];
    const z = position[i + 2];

    min.x = Math.min(min.x, x);
    min.y = Math.min(min.y, y);
    min.z = Math.min(min.z, z);

    max.x = Math.max(max.x, x);
    max.y = Math.max(max.y, y);
    max.z = Math.max(max.z, z);
  }

  const size = new Vector3().subVectors(max, min);
  
  return { min, max, size };
}

/**
 * 计算几何体的表面积（估算）
 */
export function computeSurfaceArea(geometry: ModelGeometry): number {
  let area = 0;
  const position = geometry.position;
  const indices = geometry.index;

  if (indices) {
    // 使用索引计算
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      const v1 = new Vector3(position[i1], position[i1 + 1], position[i1 + 2]);
      const v2 = new Vector3(position[i2], position[i2 + 1], position[i2 + 2]);
      const v3 = new Vector3(position[i3], position[i3 + 1], position[i3 + 2]);

      area += computeTriangleArea(v1, v2, v3);
    }
  } else {
    // 没有索引，假设是三角形列表
    for (let i = 0; i < position.length; i += 9) {
      const v1 = new Vector3(position[i], position[i + 1], position[i + 2]);
      const v2 = new Vector3(position[i + 3], position[i + 4], position[i + 5]);
      const v3 = new Vector3(position[i + 6], position[i + 7], position[i + 8]);

      area += computeTriangleArea(v1, v2, v3);
    }
  }

  return area;
}

/**
 * 计算三角形面积
 */
function computeTriangleArea(v1: Vector3, v2: Vector3, v3: Vector3): number {
  const ab = new Vector3().subVectors(v2, v1);
  const ac = new Vector3().subVectors(v3, v1);
  const cross = new Vector3().crossVectors(ab, ac);
  return cross.length() / 2;
}

/**
 * 计算几何体的体积（对闭合网格的估算）
 */
export function computeVolume(geometry: ModelGeometry): number {
  let volume = 0;
  const position = geometry.position;
  const indices = geometry.index;

  if (indices) {
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      const v1 = new Vector3(position[i1], position[i1 + 1], position[i1 + 2]);
      const v2 = new Vector3(position[i2], position[i2 + 1], position[i2 + 2]);
      const v3 = new Vector3(position[i3], position[i3 + 1], position[i3 + 2]);

      volume += computeSignedVolume(v1, v2, v3);
    }
  } else {
    for (let i = 0; i < position.length; i += 9) {
      const v1 = new Vector3(position[i], position[i + 1], position[i + 2]);
      const v2 = new Vector3(position[i + 3], position[i + 4], position[i + 5]);
      const v3 = new Vector3(position[i + 6], position[i + 7], position[i + 8]);

      volume += computeSignedVolume(v1, v2, v3);
    }
  }

  return Math.abs(volume / 6);
}

/**
 * 计算带符号的体积（用于封闭网格的体积计算）
 */
function computeSignedVolume(v1: Vector3, v2: Vector3, v3: Vector3): number {
  return v1.dot(v2.cross(v3));
}

/**
 * 计算几何体统计信息
 */
export function computeGeometryStats(geometry: ModelGeometry): ModelStats {
  const position = geometry.position;
  const indices = geometry.index;
  
  const vertices = position.length / 3;
  let faces = 0;
  let triangles = 0;
  let edges = 0;

  if (indices) {
    triangles = indices.length / 3;
    faces = triangles;
  } else {
    triangles = position.length / 9;
    faces = triangles;
  }

  // 估算边数（每个三角形有3条边，但很多边是共享的）
  // 这是一个简单的估算，实际边数会更少
  edges = Math.floor(triangles * 1.5);

  return {
    vertices,
    faces,
    triangles,
    edges
  };
}

/**
 * 将几何体数据转换为Three.js BufferGeometry
 */
export function createThreeGeometry(geometry: ModelGeometry): BufferGeometry {
  const threeGeometry = new BufferGeometry();
  
  threeGeometry.setAttribute('position', new Float32BufferAttribute(geometry.position, 3));
  
  if (geometry.normal && geometry.normal.length > 0) {
    threeGeometry.setAttribute('normal', new Float32BufferAttribute(geometry.normal, 3));
  } else {
    threeGeometry.computeVertexNormals();
  }
  
  if (geometry.index) {
    threeGeometry.setIndex(new Uint32BufferAttribute(geometry.index, 1));
  }
  
  threeGeometry.computeBoundingBox = function() {
    if (!this.boundingBox) {
      this.boundingBox = new Box3();
    }
    this.boundingBox.setFromBufferAttribute(this.attributes.position as any);
    return this.boundingBox;
  };
  
  return threeGeometry;
}

/**
 * 计算完整的模型尺寸信息
 */
export function computeModelDimensions(geometry: ModelGeometry): ModelDimensions {
  const { min, max, size } = computeBoundingBox(geometry);
  const volume = computeVolume(geometry);
  const surfaceArea = computeSurfaceArea(geometry);
  
  return {
    width: size.x,
    height: size.y,
    depth: size.z,
    volume,
    surfaceArea,
    boundingBox: {
      min: { x: min.x, y: min.y, z: min.z },
      max: { x: max.x, y: max.y, z: max.z }
    }
  };
}

/**
 * 转换单位
 */
export function convertUnits(value: number, fromUnit: string, toUnit: string): number {
  const conversion: Record<string, Record<string, number>> = {
    mm: { cm: 0.1, m: 0.001, inch: 0.0393701 },
    cm: { mm: 10, m: 0.01, inch: 0.393701 },
    m: { mm: 1000, cm: 100, inch: 39.3701 },
    inch: { mm: 25.4, cm: 2.54, m: 0.0254 }
  };

  if (fromUnit === toUnit) return value;
  return value * (conversion[fromUnit]?.[toUnit] || 1);
}

/**
 * 格式化尺寸值
 */
export function formatDimension(value: number, unit: string, decimals: number = 2): string {
  return `${value.toFixed(decimals)} ${unit}`;
}