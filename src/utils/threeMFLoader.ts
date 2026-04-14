import JSZip from 'jszip';
import { FileParserResult, ModelGeometry } from '../types';

// ─── 3MF 命名空间 ────────────────────────────────────────────────
// 官方标准命名空间
const NS_3MF = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';

// ─── 辅助函数 ──────────────────────────────────────────────────
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

// 在特定命名空间下查找元素
function findElementsByTagName(parent: Element, tagName: string, namespace: string = NS_3MF): Element[] {
  const result: Element[] = [];
  
  // 尝试带命名空间
  const nsElements = parent.getElementsByTagNameNS(namespace, tagName);
  if (nsElements.length > 0) {
    result.push(...Array.from(nsElements));
  }
  
  // 尝试不带命名空间
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length > 0) {
    for (const el of Array.from(elements)) {
      if (!result.includes(el)) {
        result.push(el);
      }
    }
  }
  
  return result;
}

// 获取元素的属性值（支持带前缀的属性）
function getAttr(element: Element, name: string): string | null {
  // 先尝试带命名空间前缀
  const namespaced = element.getAttribute(`${name}`);
  if (namespaced !== null) return namespaced;
  
  // 尝试不带前缀
  return element.getAttribute(name);
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
    
    // Step 4: 重新设计解析流程，支持组件引用模式
    console.log('开始解析3MF文件结构...');
    
    // 收集所有找到的mesh元素
    const allMeshes: Element[] = [];
    let objectIdToMesh: Map<string, Element> = new Map();
    
    // 1. 首先解析resources部分，建立对象ID到mesh的映射
    console.log('解析resources部分...');
    const resourcesElements = findElementsByTagName(xmlDoc.documentElement, 'resources');
    
    for (const resources of resourcesElements) {
      console.log(`解析resources，子元素数量: ${resources.children.length}`);
      
      // 查找所有object元素
      const objects = findElementsByTagName(resources, 'object');
      console.log(`找到 ${objects.length} 个object元素`);
      
      for (const object of objects) {
        const objectId = getAttr(object, 'id') || 'unknown';
        console.log(`解析object id=${objectId}`);
        
        // 查找object内部的mesh
        const meshesInObject = findElementsByTagName(object, 'mesh');
        if (meshesInObject.length > 0) {
          console.log(`object id=${objectId} 包含 ${meshesInObject.length} 个mesh`);
          allMeshes.push(...meshesInObject);
          objectIdToMesh.set(objectId, meshesInObject[0]); // 假设每个object只有一个mesh
        } else {
          console.log(`object id=${objectId} 不包含mesh，检查components引用`);
          
          // 检查是否有components引用
          const componentsList = findElementsByTagName(object, 'components');
          for (const components of componentsList) {
            const componentElements = findElementsByTagName(components, 'component');
            console.log(`object id=${objectId} 有 ${componentElements.length} 个component引用`);
            
            // 这里需要处理component引用，但现在先跳过
          }
        }
      }
    }
    
    // 2. 如果直接找到了mesh，使用它们
    if (allMeshes.length > 0) {
      console.log(`直接找到 ${allMeshes.length} 个mesh元素`);
    } else {
      // 3. 如果没有直接mesh，尝试从组件引用中提取
      console.log('未找到直接mesh，尝试解析build部分...');
      
      // 查找build部分
      const buildElements = findElementsByTagName(xmlDoc.documentElement, 'build');
      for (const build of buildElements) {
        const items = findElementsByTagName(build, 'item');
        console.log(`build部分有 ${items.length} 个item`);
        
        for (const item of items) {
          const objectId = getAttr(item, 'objectid');
          if (objectId) {
            console.log(`item引用了objectid=${objectId}`);
            // 这里需要根据objectId找到对应的mesh
          }
        }
      }
    }
    
    // 4. 如果还是没找到，尝试解析可能的.model文件引用
    if (allMeshes.length === 0) {
      console.log('尝试从ZIP包中查找其他.model文件...');
      
      // 查找ZIP包中所有.model文件
      const modelFiles = zip.file(/\.model$/i);
      console.log(`ZIP包中包含 ${modelFiles.length} 个.model文件`);
      
      // 排除已经加载的主.model文件
      const otherModelFiles = modelFiles.filter(f => f.name !== '_rels/.rels' && f.name !== '3D/3dmodel.model');
      
      for (const modelFile of otherModelFiles) {
        try {
          console.log(`尝试解析.model文件: ${modelFile.name}`);
          const modelContent = await modelFile.async('text');
          const modelDoc = new DOMParser().parseFromString(modelContent, 'application/xml');
          
          // 在这个.model文件中查找mesh
          const meshesInModel = findElementsByTagName(modelDoc.documentElement, 'mesh');
          if (meshesInModel.length > 0) {
            console.log(`在 ${modelFile.name} 中找到 ${meshesInModel.length} 个mesh`);
            allMeshes.push(...meshesInModel);
          }
        } catch (error) {
          console.error(`解析.model文件 ${modelFile.name} 失败:`, error);
        }
      }
    }
    
    console.log(`总共找到 ${allMeshes.length} 个mesh元素`);
    
    if (allMeshes.length === 0) {
      // 提供更详细的错误信息
      console.error('无法找到任何mesh数据。可能的3MF文件结构:');
      console.error('1. 标准模式: object -> mesh');
      console.error('2. 组件模式: object -> components -> component -> 引用其他.model文件');
      console.error('3. Bambu Studio模式: 多个.model文件，build部分引用');
      
      return { 
        success: false, 
        error: '3MF 文件中未找到网格数据。这是一个复杂的3MF文件结构，可能需要完整的3MF解析器实现。' 
      };
    }

    // Step 5: 合并所有 mesh 的几何数据
    const allPositions: number[] = [];
    const allIndices: number[] = [];
    let vertexOffset = 0;

    for (const mesh of allMeshes) {
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
