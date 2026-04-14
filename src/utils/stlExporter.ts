import { ModelGeometry } from '../types';

/**
 * 将 ModelGeometry 导出为二进制 STL 的 ArrayBuffer
 *
 * 二进制 STL 格式：
 *   80 字节   — 头部 (ASCII)
 *    4 字节   — 三角形数量 (uint32 LE)
 *   每个三角形 50 字节：
 *     3×float32  — 法线 (x, y, z)
 *     3×3×float32 — 三个顶点 (x, y, z)
 *     2 字节     — 属性字节计数 (通常为 0)
 */
export function geometryToSTLBuffer(geometry: ModelGeometry): ArrayBuffer {
  const { position, normal, index } = geometry;

  // 展开为三角形列表
  const triPositions: number[][] = [];
  const triNormals: number[][] = [];

  if (index && index.length > 0) {
    // 有索引模式
    for (let i = 0; i < index.length; i += 3) {
      const i0 = index[i];
      const i1 = index[i + 1];
      const i2 = index[i + 2];

      triPositions.push([
        position[i0 * 3], position[i0 * 3 + 1], position[i0 * 3 + 2],
        position[i1 * 3], position[i1 * 3 + 1], position[i1 * 3 + 2],
        position[i2 * 3], position[i2 * 3 + 1], position[i2 * 3 + 2],
      ]);

      // 取第一个顶点法线，或者重新计算面法线
      if (normal.length >= (i0 * 3 + 2)) {
        triNormals.push([normal[i0 * 3], normal[i0 * 3 + 1], normal[i0 * 3 + 2]]);
      } else {
        triNormals.push(computeFaceNormal(
          position[i0 * 3], position[i0 * 3 + 1], position[i0 * 3 + 2],
          position[i1 * 3], position[i1 * 3 + 1], position[i1 * 3 + 2],
          position[i2 * 3], position[i2 * 3 + 1], position[i2 * 3 + 2],
        ));
      }
    }
  } else {
    // 无索引模式（每 3 个顶点一个三角形）
    for (let i = 0; i < position.length / 3; i += 3) {
      const i0 = i, i1 = i + 1, i2 = i + 2;
      triPositions.push([
        position[i0 * 3], position[i0 * 3 + 1], position[i0 * 3 + 2],
        position[i1 * 3], position[i1 * 3 + 1], position[i1 * 3 + 2],
        position[i2 * 3], position[i2 * 3 + 1], position[i2 * 3 + 2],
      ]);
      if (normal.length >= (i0 * 3 + 2)) {
        triNormals.push([normal[i0 * 3], normal[i0 * 3 + 1], normal[i0 * 3 + 2]]);
      } else {
        triNormals.push(computeFaceNormal(
          position[i0 * 3], position[i0 * 3 + 1], position[i0 * 3 + 2],
          position[i1 * 3], position[i1 * 3 + 1], position[i1 * 3 + 2],
          position[i2 * 3], position[i2 * 3 + 1], position[i2 * 3 + 2],
        ));
      }
    }
  }

  const triCount = triPositions.length;
  const buffer = new ArrayBuffer(80 + 4 + triCount * 50);
  const dv = new DataView(buffer);

  // 写入 80 字节头部
  const encoder = new TextEncoder();
  const headerText = 'Exported by 3D Model Viewer - github.com/freall/3d-model-viewer';
  const headerBytes = encoder.encode(headerText);
  for (let i = 0; i < Math.min(80, headerBytes.length); i++) {
    dv.setUint8(i, headerBytes[i]);
  }

  // 写入三角形数量
  dv.setUint32(80, triCount, true);

  // 写入每个三角形
  let offset = 84;
  for (let i = 0; i < triCount; i++) {
    const n = triNormals[i];
    const p = triPositions[i];

    // 法线
    dv.setFloat32(offset,      n[0], true); offset += 4;
    dv.setFloat32(offset,      n[1], true); offset += 4;
    dv.setFloat32(offset,      n[2], true); offset += 4;

    // 3 个顶点
    for (let v = 0; v < 3; v++) {
      dv.setFloat32(offset, p[v * 3],     true); offset += 4;
      dv.setFloat32(offset, p[v * 3 + 1], true); offset += 4;
      dv.setFloat32(offset, p[v * 3 + 2], true); offset += 4;
    }

    // 属性字节计数
    dv.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
}

/** 从三角形坐标计算面法线 */
function computeFaceNormal(
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
): number[] {
  const ax = x1 - x0, ay = y1 - y0, az = z1 - z0;
  const bx = x2 - x0, by = y2 - y0, bz = z2 - z0;
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / len, ny / len, nz / len];
}

/**
 * 下载 geometry 为 STL 文件
 * @param geometry  模型几何数据
 * @param filename  不含扩展名的文件名（默认 "model"）
 */
export function downloadAsSTL(geometry: ModelGeometry, filename = 'model'): void {
  const buffer = geometryToSTLBuffer(geometry);
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.stl`;
  a.click();

  // 延迟释放，确保下载触发
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
