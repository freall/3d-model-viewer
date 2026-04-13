import { ModelGeometry, FileParserResult } from '../types';

/**
 * 解析STL文件（二进制或ASCII格式）
 */
export async function parseSTLFile(file: File): Promise<FileParserResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    
    // 检查文件类型（二进制或ASCII）
    const isBinary = isSTLBinary(dataView, arrayBuffer.byteLength);
    
    if (isBinary) {
      return parseBinarySTL(dataView);
    } else {
      const text = await file.text();
      return parseASCIISTL(text);
    }
  } catch (error) {
    return {
      success: false,
      error: `STL解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 检查STL文件是否为二进制格式
 */
function isSTLBinary(dataView: DataView, byteLength: number): boolean {
  // 前80字节是头部信息，不用于判断
  if (byteLength < 84) return false;
  
  // 检查前几个字节是否包含可打印字符（ASCII STL的特征）
  let asciiCharCount = 0;
  for (let i = 0; i < Math.min(80, byteLength); i++) {
    const char = dataView.getUint8(i);
    if (char >= 32 && char <= 126) { // 可打印ASCII字符范围
      asciiCharCount++;
    }
  }
  
  // 如果大部分字符都是可打印的，可能是ASCII格式
  if (asciiCharCount > 70) {
    // 进一步检查是否包含"solid"关键字
    try {
      const decoder = new TextDecoder('ascii');
      const header = decoder.decode(new Uint8Array(dataView.buffer, 0, 80));
      return !header.toLowerCase().includes('solid');
    } catch {
      return true;
    }
  }
  
  return true;
}

/**
 * 解析二进制STL文件
 */
function parseBinarySTL(dataView: DataView): FileParserResult {
  try {
    // 跳过80字节的头部
    const triangleCount = dataView.getUint32(80, true);
    
    // 验证文件大小
    const expectedSize = 84 + triangleCount * 50;
    if (dataView.byteLength < expectedSize) {
      return {
        success: false,
        error: 'STL文件大小不正确，可能已损坏'
      };
    }

    const positions: number[] = [];
    const normals: number[] = [];
    
    let offset = 84;
    
    for (let i = 0; i < triangleCount; i++) {
      // 读取法线（3个float32）
      const nx = dataView.getFloat32(offset, true);
      const ny = dataView.getFloat32(offset + 4, true);
      const nz = dataView.getFloat32(offset + 8, true);
      
      // 读取三个顶点（每个顶点3个float32）
      for (let v = 0; v < 3; v++) {
        const vx = dataView.getFloat32(offset + 12 + v * 12, true);
        const vy = dataView.getFloat32(offset + 16 + v * 12, true);
        const vz = dataView.getFloat32(offset + 20 + v * 12, true);
        
        positions.push(vx, vy, vz);
        normals.push(nx, ny, nz);
      }
      
      // 跳过属性字节计数（2字节）
      offset += 50;
    }

    // 生成索引（三角形列表）
    const indices = new Array(positions.length / 3);
    for (let i = 0; i < indices.length; i++) {
      indices[i] = i;
    }

    const geometry: ModelGeometry = {
      position: new Float32Array(positions),
      normal: new Float32Array(normals),
      index: new Uint32Array(indices)
    };

    return {
      success: true,
      geometry
    };
  } catch (error) {
    return {
      success: false,
      error: `二进制STL解析错误: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 解析ASCII STL文件
 */
function parseASCIISTL(text: string): FileParserResult {
  try {
    const lines = text.split('\n').map(line => line.trim());
    let currentLine = 0;
    
    // 检查文件是否以"solid"开头
    if (lines[currentLine].toLowerCase().startsWith('solid')) {
      currentLine++;
    } else {
      return {
        success: false,
        error: 'ASCII STL文件必须以"solid"开头'
      };
    }

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    
    let vertexIndex = 0;
    
    while (currentLine < lines.length) {
      const line = lines[currentLine];
      
      if (line.toLowerCase().startsWith('facet normal')) {
        // 解析法线
        const normalMatch = line.match(/facet normal\s+([-+]?\d*\.?\d+([eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+([eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+([eE][-+]?\d+)?)/i);
        if (!normalMatch) {
          currentLine++;
          continue;
        }
        
        const nx = parseFloat(normalMatch[1]);
        const ny = parseFloat(normalMatch[3]);
        const nz = parseFloat(normalMatch[5]);
        
        currentLine++;
        
        // 检查outer loop
        if (!lines[currentLine]?.toLowerCase().includes('outer loop')) {
          return {
            success: false,
            error: '期望 "outer loop"'
          };
        }
        currentLine++;
        
        // 读取三个顶点
        for (let v = 0; v < 3; v++) {
          const vertexLine = lines[currentLine];
          const vertexMatch = vertexLine?.match(/vertex\s+([-+]?\d*\.?\d+([eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+([eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+([eE][-+]?\d+)?)/i);
          
          if (!vertexMatch) {
            return {
              success: false,
              error: `第${currentLine + 1}行: 期望顶点数据`
            };
          }
          
          const vx = parseFloat(vertexMatch[1]);
          const vy = parseFloat(vertexMatch[3]);
          const vz = parseFloat(vertexMatch[5]);
          
          positions.push(vx, vy, vz);
          normals.push(nx, ny, nz);
          indices.push(vertexIndex++);
          
          currentLine++;
        }
        
        // 检查endloop
        if (!lines[currentLine]?.toLowerCase().includes('endloop')) {
          return {
            success: false,
            error: '期望 "endloop"'
          };
        }
        currentLine++;
        
        // 检查endfacet
        if (!lines[currentLine]?.toLowerCase().includes('endfacet')) {
          return {
            success: false,
            error: '期望 "endfacet"'
          };
        }
        currentLine++;
      } else if (line.toLowerCase().startsWith('endsolid')) {
        // 文件结束
        break;
      } else {
        currentLine++;
      }
    }

    if (positions.length === 0) {
      return {
        success: false,
        error: 'STL文件中未找到有效的三角形数据'
      };
    }

    const geometry: ModelGeometry = {
      position: new Float32Array(positions),
      normal: new Float32Array(normals),
      index: new Uint32Array(indices)
    };

    return {
      success: true,
      geometry
    };
  } catch (error) {
    return {
      success: false,
      error: `ASCII STL解析错误: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 验证STL文件
 */
export function validateSTLFile(file: File): string | null {
  const fileName = file.name.toLowerCase();
  
  if (!fileName.endsWith('.stl')) {
    return '文件必须是.stl扩展名';
  }
  
  if (file.size === 0) {
    return '文件为空';
  }
  
  // 检查文件大小（最大100MB）
  if (file.size > 100 * 1024 * 1024) {
    return '文件过大，请上传小于100MB的文件';
  }
  
  return null;
}

/**
 * 检测STL文件格式
 */
export function detectSTLFormat(dataView: DataView): 'binary' | 'ascii' | 'unknown' {
  const isBinary = isSTLBinary(dataView, dataView.byteLength);
  return isBinary ? 'binary' : 'ascii';
}