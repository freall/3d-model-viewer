import { parseSTLFile, validateSTLFile } from './stlParser';
import { parse3MFFile, validate3MFFile } from './threeMFLoader';
import { computeModelDimensions, computeGeometryStats } from './geometryUtils';
import { ModelFile, FileParserResult, ModelDimensions, ModelStats } from '../types';

/**
 * 主文件解析器
 */
export async function parseFile(file: File): Promise<{
  success: boolean;
  geometry?: any;
  dimensions?: ModelDimensions;
  stats?: ModelStats;
  error?: string;
  fileInfo?: ModelFile;
}> {
  try {
    // 确定文件类型
    const fileName = file.name.toLowerCase();
    let parserResult: FileParserResult;
    let validationError: string | null = null;

    if (fileName.endsWith('.stl')) {
      validationError = validateSTLFile(file);
      if (validationError) {
        return {
          success: false,
          error: validationError
        };
      }
      parserResult = await parseSTLFile(file);
    } else if (fileName.endsWith('.3mf')) {
      validationError = validate3MFFile(file);
      if (validationError) {
        return {
          success: false,
          error: validationError
        };
      }
      parserResult = await parse3MFFile(file);
    } else {
      return {
        success: false,
        error: '不支持的文件格式。请上传3MF或STL文件。'
      };
    }

    if (!parserResult.success || !parserResult.geometry) {
      return {
        success: false,
        error: parserResult.error || '文件解析失败'
      };
    }

    // 计算模型尺寸和统计信息
    const dimensions = computeModelDimensions(parserResult.geometry);
    const stats = computeGeometryStats(parserResult.geometry);

    // 创建文件信息对象
    const fileInfo: ModelFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: fileName.endsWith('.3mf') ? '3mf' : 'stl',
      size: file.size,
      url: URL.createObjectURL(file),
      uploadedAt: new Date()
    };

    return {
      success: true,
      geometry: parserResult.geometry,
      dimensions,
      stats,
      fileInfo
    };

  } catch (error) {
    return {
      success: false,
      error: `文件处理失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 检测文件类型
 */
export function detectFileType(file: File): '3mf' | 'stl' | 'unknown' {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.3mf')) {
    return '3mf';
  } else if (fileName.endsWith('.stl')) {
    return 'stl';
  } else {
    return 'unknown';
  }
}

/**
 * 验证上传文件
 */
export function validateUploadFile(file: File): string | null {
  const fileName = file.name.toLowerCase();
  
  // 检查文件大小
  if (file.size === 0) {
    return '文件为空';
  }
  
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return '文件过大，请上传小于100MB的文件';
  }
  
  // 检查文件类型
  if (!fileName.endsWith('.3mf') && !fileName.endsWith('.stl')) {
    return '只支持3MF或STL格式的文件';
  }
  
  return null;
}

/**
 * 获取文件信息
 */
export function getFileInfo(file: File): {
  name: string;
  size: string;
  type: string;
  lastModified: string;
} {
  const fileType = detectFileType(file);
  const typeString = fileType === '3mf' ? '3MF (3D Manufacturing Format)' :
                     fileType === 'stl' ? 'STL (Stereolithography)' :
                     '未知格式';

  const sizeInMB = file.size / (1024 * 1024);
  const sizeString = sizeInMB < 1 
    ? `${(file.size / 1024).toFixed(2)} KB` 
    : `${sizeInMB.toFixed(2)} MB`;

  return {
    name: file.name,
    size: sizeString,
    type: typeString,
    lastModified: new Date(file.lastModified).toLocaleString('zh-CN')
  };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 检查文件是否可以被解析
 */
export async function canParseFile(file: File): Promise<{
  canParse: boolean;
  reason?: string;
}> {
  const fileName = file.name.toLowerCase();
  
  if (!fileName.endsWith('.3mf') && !fileName.endsWith('.stl')) {
    return {
      canParse: false,
      reason: '不支持的文件格式'
    };
  }
  
  if (file.size === 0) {
    return {
      canParse: false,
      reason: '文件为空'
    };
  }
  
  if (file.size > 100 * 1024 * 1024) {
    return {
      canParse: false,
      reason: '文件过大（超过100MB）'
    };
  }
  
  // 对于STL文件，尝试读取前几个字节来检查格式
  if (fileName.endsWith('.stl') && file.size > 84) {
    try {
      const slice = file.slice(0, 100);
      const arrayBuffer = await slice.arrayBuffer();
      const dataView = new DataView(arrayBuffer);
      
      // 检查是否为有效的STL文件
      // 二进制STL：头部80字节 + 三角形数量（4字节）
      // ASCII STL：以"solid"开头
      const decoder = new TextDecoder('ascii');
      const header = decoder.decode(new Uint8Array(arrayBuffer, 0, 80));
      
      if (header.toLowerCase().includes('solid')) {
        // ASCII STL
        return { canParse: true };
      } else {
        // 可能是二进制STL，检查三角形数量是否合理
        const triangleCount = dataView.getUint32(80, true);
        const expectedSize = 84 + triangleCount * 50;
        
        if (expectedSize <= file.size) {
          return { canParse: true };
        } else {
          return {
            canParse: false,
            reason: 'STL文件可能已损坏'
          };
        }
      }
    } catch {
      return { canParse: true }; // 如果检查失败，仍然尝试解析
    }
  }
  
  return { canParse: true };
}