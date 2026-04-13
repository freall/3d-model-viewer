import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Ruler, Brain, Zap, CheckCircle, Box as Cube } from 'lucide-react';
import { ModelFile, ModelDimensions, ModelStats } from './types';
import FileUploader from './components/FileUploader/FileUploader';
import ModelViewer from './components/ModelViewer/ModelViewer';
import ModelControls from './components/ModelControls/ModelControls';
import DimensionsPanel from './components/DimensionsPanel/DimensionsPanel';
import './App.css';

const App: React.FC = () => {
  const [modelFile, setModelFile] = useState<ModelFile | null>(null);
  const [dimensions, setDimensions] = useState<ModelDimensions | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback((file: ModelFile) => {
    setModelFile(file);
    setError(null);
    setIsLoading(true);
    
    // 这里稍后会实现文件解析逻辑
    setTimeout(() => {
      // 模拟解析完成
      const mockDimensions: ModelDimensions = {
        width: 120.5,
        height: 85.3,
        depth: 45.2,
        volume: 460820,
        surfaceArea: 35840,
        boundingBox: {
          min: { x: -60.25, y: -42.65, z: -22.6 },
          max: { x: 60.25, y: 42.65, z: 22.6 }
        }
      };

      const mockStats: ModelStats = {
        vertices: 14562,
        faces: 29124,
        triangles: 29124,
        edges: 43686
      };

      setDimensions(mockDimensions);
      setStats(mockStats);
      setIsLoading(false);
    }, 1500);
  }, []);

  const handleFileError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setModelFile(null);
    setDimensions(null);
    setStats(null);
  }, []);

  const handleClearModel = useCallback(() => {
    setModelFile(null);
    setDimensions(null);
    setStats(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 transition-colors duration-300">
      <header className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Cube className="w-12 h-12 text-primary-600 dark:text-primary-400" />
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400">
              3D模型查看器
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            上传您的3MF或STL文件，实时查看3D模型，精确测量尺寸，分析模型结构
          </p>
        </motion.div>
      </header>

      <main className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：上传区域和控制面板 */}
          <div className="lg:col-span-1 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <FileUploader
                onFileUpload={handleFileUpload}
                onError={handleFileError}
                isLoading={isLoading}
                currentFile={modelFile}
              />
            </motion.div>

            {modelFile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <ModelControls
                  onClear={handleClearModel}
                  showGrid={true}
                  onShowGridChange={() => {}}
                  showAxes={true}
                  onShowAxesChange={() => {}}
                  lighting="default"
                  onLightingChange={() => {}}
                />
              </motion.div>
            )}

            {/* 功能特性 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                核心功能
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-green-500" />
                  <span>支持3MF/STL格式文件上传</span>
                </li>
                <li className="flex items-center gap-2">
                  <Cube className="w-4 h-4 text-blue-500" />
                  <span>实时3D模型渲染与交互</span>
                </li>
                <li className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-purple-500" />
                  <span>精确尺寸测量与显示</span>
                </li>
                <li className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-pink-500" />
                  <span>模型结构与数据统计</span>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* 中间：3D模型查看器 */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <ModelViewer
                file={modelFile}
                dimensions={dimensions}
                stats={stats}
                isLoading={isLoading}
                error={error}
              />
            </motion.div>

            {/* 尺寸面板 */}
            {dimensions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-6"
              >
                <DimensionsPanel
                  dimensions={dimensions}
                  stats={stats}
                  units={{ length: 'mm', volume: 'mm³' }}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* 操作指南 */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 bg-gradient-to-r from-primary-500/10 to-blue-500/10 dark:from-primary-500/5 dark:to-blue-500/5 rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            使用指南
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/50 dark:bg-gray-800/50 p-5 rounded-xl">
              <div className="text-3xl font-bold text-primary-600 mb-2">01</div>
              <h4 className="font-semibold mb-2">上传文件</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                拖拽或点击上传3MF或STL格式的3D模型文件，支持二进制和ASCII格式
              </p>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 p-5 rounded-xl">
              <div className="text-3xl font-bold text-primary-600 mb-2">02</div>
              <h4 className="font-semibold mb-2">查看模型</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                使用鼠标或触摸屏旋转、缩放、平移3D模型，从不同角度观察细节
              </p>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 p-5 rounded-xl">
              <div className="text-3xl font-bold text-primary-600 mb-2">03</div>
              <h4 className="font-semibold mb-2">测量分析</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                查看精确尺寸数据，分析模型面数、顶点数等统计信息
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            © 2026 3D模型查看器 • 基于Three.js和React构建 • 支持3MF/STL格式
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            所有模型解析均在浏览器本地完成，无需上传到服务器
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;