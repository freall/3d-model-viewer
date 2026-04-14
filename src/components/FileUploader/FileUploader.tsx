import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ModelFile } from '../../types';

interface FileUploaderProps {
  onFileUpload: (file: ModelFile) => void;
  onRawFile?: (file: File) => void;  // 新增：传递原始 File 对象供解析
  onError: (error: string) => void;
  isLoading: boolean;
  currentFile: ModelFile | null;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileUpload,
  onRawFile,
  onError,
  isLoading,
  currentFile,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFile = (file: File): string | null => {
    // 检查文件大小（最大100MB）
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return '文件过大，请上传小于100MB的文件';
    }

    // 检查文件类型
    const fileName = file.name.toLowerCase();
    const is3MF = fileName.endsWith('.3mf');
    const isSTL = fileName.endsWith('.stl');
    
    if (!is3MF && !isSTL) {
      return '只支持3MF或STL格式的文件';
    }

    return null;
  };

  const processFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      onError(error);
      return;
    }

    // 如果有 onRawFile，直接交给 App.tsx 的真实解析器处理
    if (onRawFile) {
      onRawFile(file);
      return;
    }

    // fallback：老逻辑（模拟上传）
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 50);

    const fileName = file.name.toLowerCase();
    const fileType = fileName.endsWith('.3mf') ? '3mf' : 
                     fileName.endsWith('.stl') ? 'stl' : 'unknown';

    const objectUrl = URL.createObjectURL(file);

    const modelFile: ModelFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: fileType,
      size: file.size,
      url: objectUrl,
      uploadedAt: new Date(),
    };

    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        onFileUpload(modelFile);
        setUploadProgress(0);
      }, 300);
    }, 500);
  }, [onFileUpload, onRawFile, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
      // 重置input以便可以再次选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [processFile]);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback(() => {
    if (currentFile?.url) {
      URL.revokeObjectURL(currentFile.url);
    }
    onError('文件已移除');
  }, [currentFile, onError]);

  return (
    <div className="space-y-4">
      {/* 文件上传区域 */}
      {!currentFile && !isLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
              isDragging 
                ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 scale-[1.02]' 
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".3mf,.stl"
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-blue-100 dark:from-primary-900/30 dark:to-blue-900/30 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">上传3D模型文件</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  拖拽文件到此处，或点击选择文件
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  支持格式：3MF、STL（二进制/ASCII）
                </p>
              </div>

              <button
                onClick={handleClickUpload}
                className="btn-primary flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                选择文件
              </button>
            </div>

            {isDragging && (
              <div className="absolute inset-0 bg-primary-500/10 rounded-2xl flex items-center justify-center">
                <p className="text-primary-600 dark:text-primary-400 font-medium">
                  释放文件以上传
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 上传进度 */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">正在处理文件...</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                正在解析3D模型数据
              </p>
            </div>
            <span className="text-primary-600 font-semibold">{uploadProgress}%</span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-primary-500 to-blue-500 h-2 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </motion.div>
      )}

      {/* 已上传文件信息 */}
      {currentFile && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-lg truncate">{currentFile.name}</h4>
                <button
                  onClick={handleRemoveFile}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <File className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {currentFile.type.toUpperCase()} 格式
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    文件大小：{(currentFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    上传时间：{currentFile.uploadedAt.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 使用提示 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>提示：</strong>所有文件处理均在浏览器本地完成，不会上传到任何服务器，确保您的数据安全。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;