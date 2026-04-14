import JSZip from 'jszip';
import { FileParserResult, ModelGeometry } from '../types';

// ─── 3MF 命名空间 ────────────────────────────────────────────────
// 官方标准命名空间
const NS_3MF = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';

// ─── 辅助：安全解析 float ────────────────────────────────────────
function pf(s: string | null, fallback = 0): number {
  if (!s) return fallback;
  const v = parseFloat(s);
  return isNaN(v) ? fallback : v;
}

function pi(s: string | null, fallback = 0): number {
  if (!s) return fallback;
  const v = parseInt(s, 10);
  return isNaN(v) ? fallback : v;
}

// ─── 计算三角形法线 ──────────────────────────────────────────────
function computeNormalsFromPositions(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  const count = indices.length / 3;

  for (let i = 0; i < count; i++) {
    const i0 = indices[i * 3] * 3;
    const i1 = indices[i * 3 + 1] * 3;
    const i2 = indices[i * 3 + 2] * 3;

    const ax = positions[i1] - positions[i0];
    const ay = positions[i1 + 1] - positions[i0 + 1];
    const az = positions[i1 + 2] - positions[i0 + 2];

    const bx = positions[i2] - positions[i0];
    const by = positions[i2 + 1] - positions[i0 + 1];
    const bz = positions[i2 + 2] - positions[i0 + 2];

    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;

    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

    for (const idx of [i0, i1, i2]) {
      normals[idx]     += nx / len;
      normals[idx + 1] += ny / len;
      normals[idx + 2] += nz / len;
    }
  }

  // 归一化每个顶点法线
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2) || 1;
    normals[i]     /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }

  return normals;
}

// ─── 解析单个 <mesh> 节点 ─────────────────────────────────────────
function parseMeshNode(mesh: Element): { positions: number[]; indices: number[] } | null {
  // 尝试带命名空间和不带命名空间两种方式获取子元素
  const getChildren = (parent: Element, tag: string): Element[] => {
    // 先尝试带命名空间
    const nsElements = parent.getElementsByTagNameNS(NS_3MF, tag);
    if (nsElements.length > 0) {
      return Array.from(nsElements);
    }
    // 再尝试不带命名空间
    const elements = parent.getElementsByTagName(tag);
    return elements ? Array.from(elements) : [];
  };

  const verticesEls = getChildren(mesh, 'vertices');
  const trianglesEls = getChildren(mesh, 'triangles');

  if (verticesEls.length === 0 || trianglesEls.length === 0) return null;

  const verticesEl = verticesEls[0];
  const trianglesEl = trianglesEls[0];

  const vertexEls = getChildren(verticesEl, 'vertex');
  const triangleEls = getChildren(trianglesEl, 'triangle');

  if (vertexEls.length === 0 || triangleEls.length === 0) return null;

  const positions: number[] = [];
  for (const v of vertexEls) {
    positions.push(
      pf(v.getAttribute('x')),
      pf(v.getAttribute('y')),
      pf(v.getAttribute('z')),
    );
  }

  const indices: number[] = [];
  for (const t of triangleEls) {
    indices.push(
      pi(t.getAttribute('v1')),
      pi(t.getAttribute('v2')),
      pi(t.getAttribute('v3')),
    );
  }

  return { positions, indices };
}

// ─── 主解析函数 ──────────────────────────────────────────────────
export async function parse3MFFile(file: File): Promise<FileParserResult> {
  try {
    if (!file.name.toLowerCase().endsWith('.3mf')) {
      return { success: false, error: '文件必须是 .3mf 格式' };
    }
    if (file.size === 0) return { success: false, error: '文件为空' };
    if (file.size > 100 * 1024 * 1024) {
      return { success: false, error: '文件过大，请上传小于 100MB 的文件' };
    }

    // Step 1: 解压 ZIP
    const arrayBuffer = await file.arrayBuffer();
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(arrayBuffer);
    } catch {
      return { success: false, error: '无法解压文件，请确认是有效的 3MF 文件' };
    }

    // Step 2: 找到 .model 文件（先查 _rels/.rels，再 fallback 搜索）
    let modelContent: string | null = null;

    const relsFile = zip.file('_rels/.rels');
    if (relsFile) {
      try {
        const relsText = await relsFile.async('text');
        const relsDoc = new DOMParser().parseFromString(relsText, 'application/xml');
        const relationships = relsDoc.getElementsByTagName('Relationship');
        for (const rel of Array.from(relationships)) {
          const type = rel.getAttribute('Type') || '';
          if (type.includes('3dmodel')) {
            const target = (rel.getAttribute('Target') || '').replace(/^\//, '');
            const modelFile = zip.file(target);
            if (modelFile) {
              modelContent = await modelFile.async('text');
              break;
            }
          }
        }
      } catch { /* 继续 fallback */ }
    }

    if (!modelContent) {
      // Fallback：直接找 .model 文件
      const modelFiles = zip.file(/\.model$/i);
      if (modelFiles.length === 0) {
        return { success: false, error: '3MF 文件中未找到模型数据（缺少 .model 文件）' };
      }
      modelContent = await modelFiles[0].async('text');
    }

    // Step 3: 解析 XML
    const xmlDoc = new DOMParser().parseFromString(modelContent, 'application/xml');
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('XML解析错误:', parseError.textContent);
      return { success: false, error: '3MF 模型 XML 解析失败，文件可能已损坏' };
    }

    // 调试：显示XML结构的前几行
    console.log('XML documentElement:', xmlDoc.documentElement?.tagName, 'namespace:', xmlDoc.documentElement?.namespaceURI);
    
    // Step 4: 采用更智能的查找策略
    console.log('XML文档结构:', xmlDoc.documentElement?.outerHTML?.substring(0, 1000));
    
    const allElements: Element[] = [];
    
    // 方法1: 递归遍历所有元素，查找任何包含"mesh"的元素
    const traverseElements = (node: Element) => {
      // 检查当前节点的tagName是否包含"mesh"
      const tagName = node.tagName.toLowerCase();
      
      if (tagName.includes('mesh')) {
        console.log('找到mesh元素:', node.tagName, 'namespace:', node.namespaceURI);
        allElements.push(node);
      }
      
      // 遍历子元素
      for (const child of Array.from(node.children)) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          traverseElements(child as Element);
        }
      }
    };
    
    traverseElements(xmlDoc.documentElement);
    
    // 方法2: 如果还没找到，尝试更直接的XPath查询
    if (allElements.length === 0) {
      console.log('尝试XPath查找...');
      
      // 尝试不同的命名空间组合
      const namespaces = [
        'http://schemas.microsoft.com/3dmanufacturing/core/2015/02',  // 官方
        'http://schemas.microsoft.com/3dmanufacturing/core/2015/02',  // 常用
        'http://schemas.microsoft.com/3dmanufacturing/core/2017/02',  // 新版本
        null  // 无命名空间
      ];
      
      for (const ns of namespaces) {
        const query = ns ? `//*[local-name()='mesh' and namespace-uri()='${ns}']` : '//mesh';
        const result = xmlDoc.evaluate(
          query, 
          xmlDoc, 
          null, 
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
          null
        );
        
        for (let i = 0; i < result.snapshotLength; i++) {
          const el = result.snapshotItem(i) as Element;
          if (!allElements.includes(el)) {
            console.log('XPath找到mesh:', el.tagName, 'namespace:', el.namespaceURI);
            allElements.push(el);
          }
        }
      }
    }
    
    console.log(`总共找到 ${allElements.length} 个mesh元素`);
    if (allElements.length === 0) {
      // 输出更详细的调试信息
      const root = xmlDoc.documentElement;
      console.log('根元素完整tag:', root?.outerHTML?.substring(0, 500));
      const children = Array.from(root?.children || []);
      console.log('根元素子节点:', children.map(c => c.tagName).join(', '));
      
      return { success: false, error: '3MF 文件中未找到网格数据' };
    }

    // Step 5: 合并所有 mesh 的几何数据
    const allPositions: number[] = [];
    const allIndices: number[] = [];
    let vertexOffset = 0;

    for (const mesh of allElements) {
      const result = parseMeshNode(mesh);
      if (!result) continue;

      allPositions.push(...result.positions);
      for (const idx of result.indices) {
        allIndices.push(idx + vertexOffset);
      }
      vertexOffset += result.positions.length / 3;
    }

    if (allPositions.length === 0) {
      return { success: false, error: '未找到有效的几何数据' };
    }

    const posFloat = new Float32Array(allPositions);
    const idxUint = new Uint32Array(allIndices);
    const normals = computeNormalsFromPositions(posFloat, idxUint);

    const geometry: ModelGeometry = {
      position: posFloat,
      normal: normals,
      index: idxUint,
    };

    return { success: true, geometry };

  } catch (error) {
    return {
      success: false,
      error: `3MF 解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

// ─── 验证 ────────────────────────────────────────────────────────
export function validate3MFFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.3mf')) return '文件必须是 .3mf 格式';
  if (file.size === 0) return '文件为空';
  if (file.size > 100 * 1024 * 1024) return '文件过大，请上传小于 100MB 的文件';
  return null;
}

export async function is3MFFile(file: File): Promise<boolean> {
  try {
    if (!file.name.toLowerCase().endsWith('.3mf')) return false;
    const arrayBuffer = await file.slice(0, 4).arrayBuffer();
    const dv = new DataView(arrayBuffer);
    const magic = dv.getUint32(0, false);
    return magic === 0x504B0304 || magic === 0x504B0506 || magic === 0x504B0708;
  } catch {
    return false;
  }
}
