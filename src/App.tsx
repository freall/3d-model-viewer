import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Ruler, Brain, Zap, CheckCircle, Box as Cube, RefreshCw, ArrowDownToLine } from 'lucide-react';
import { ModelFile, ModelDimensions, ModelStats, ModelGeometry } from './types';
import { parseFile } from './utils/fileParser';
import { downloadAsSTL } from './utils/stlExporter';
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
  const [geometryRef, setGeometryRef] = useState<ModelGeometry | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState(false);

  // 处理文件上传：调用真实解析器
  const handleFileUpload = useCallback(async (file: ModelFile) => {
    setModelFile(file);
    setError(null);
    setIsLoading(true);
    setGeometryRef(null);
    setDimensions(null);
    setStats(null);
    setConvertSuccess(false);

    try {
      // 通过 URL 重建 File 对象已不可行，我们在 FileUploader 中需要传原始 File
      // 但当前架构 onFileUpload 只收到 ModelFile，几何体由 parseFile 处理
      // 此处 geometry 已通过 handleRawFile 提前解析并存储
    } catch {
      // 会在 handleRawFile 中处理
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 真正的解析入口：FileUploader 拿到 raw File 后调用
  const handleRawFile = useCallback(async (rawFile: File) => {
    setError(null);
    setIsLoading(true);
    setGeometryRef(null);
    setDimensions(null);
    setStats(null);
    setConvertSuccess(false);

    const result = await parseFile(rawFile);

    if (!result.success || !result.geometry) {
      setError(result.error || '文件解析失败');
      setModelFile(null);
      setIsLoading(false);
      return;
    }

    setGeometryRef(result.geometry);
    if (result.dimensions) setDimensions(result.dimensions);
    if (result.stats) setStats(result.stats);
    if (result.fileInfo) setModelFile(result.fileInfo);

    setIsLoading(false);
  }, []);

  const handleFileError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setModelFile(null);
    setDimensions(null);
    setStats(null);
    setGeometryRef(null);
  }, []);

  const handleClearModel = useCallback(() => {
    setModelFile(null);
    setDimensions(null);
    setStats(null);
    setError(null);
    setGeometryRef(null);
    setConvertSuccess(false);
  }, []);

  // ─── 3MF → STL 转换 ─────────────────────────────────────────
  const handleConvertToSTL = useCallback(async () => {
    if (!geometryRef || !modelFile) return;

    setIsConverting(true);
    try {
      const baseName = modelFile.name.replace(/\.(3mf|stl)$/i, '');
      // 在 Web Worker 或主线程中运行都可以；数据量不超过几十万三角形时主线程足够
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          downloadAsSTL(geometryRef, baseName);
          resolve();
        }, 0);
      });
      setConvertSuccess(true);
      setTimeout(() => setConvertSuccess(false), 3000);
    } finally {
      setIsConverting(false);
    }
  }, [geometryRef, modelFile]);

  const is3MF = modelFile?.type === '3mf';
  const canConvert = !!geometryRef && !isLoading;

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
            上传3MF或STL文件，实时查看3D模型、精确测量尺寸，并支持 3MF → STL 格式转换
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
                onRawFile={handleRawFile}
                onError={handleFileError}
                isLoading={isLoading}
                currentFile={modelFile}
              />
            </motion.div>

            {/* 3MF → STL 转换卡片 */}
            <AnimatePresence>
              {canConvert && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-blue-200 dark:border-blue-800"
                >
                  <h3 className="font-semibold text-base mb-1 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <ArrowDownToLine className="w-4 h-4 text-blue-500" />
                    {is3MF ? '3MF → STL 转换' : '导出 STL'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {is3MF
                      ? '将当前 3MF 模型的几何数据导出为二进制 STL 文件，可直接用于切片软件。'
                      : '将当前模型重新导出为二进制 STL 文件。'}
                  </p>
                  <button
                    onClick={handleConvertToSTL}
                    disabled={isConverting}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all
                      ${convertSuccess
                        ? 'bg-green-500 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md hover:shadow-lg'}
                      disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {isConverting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        正在转换…
                      </>
                    ) : convertSuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        转换成功！已下载
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="w-4 h-4" />
                        {is3MF ? '转换并下载 STL' : '下载 STL'}
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

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
                  <ArrowDownToLine className="w-4 h-4 text-indigo-500" />
                  <span>3MF → STL 格式转换导出</span>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/50 dark:bg-gray-800/50 p-5 rounded-xl">
              <div className="text-3xl font-bold text-primary-600 mb-2">01</div>
              <h4 className="font-semibold mb-2">上传文件</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                拖拽或点击上传3MF或STL格式的3D模型文件
              </p>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 p-5 rounded-xl">
              <div className="text-3xl font-bold text-primary-600 mb-2">02</div>
              <h4 className="font-semibold mb-2">查看模型</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                使用鼠标或触摸屏旋转、缩放、平移3D模型
              </p>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 p-5 rounded-xl">
              <div className="text-3xl font-bold text-primary-600 mb-2">03</div>
              <h4 className="font-semibold mb-2">测量分析</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                查看精确尺寸数据，分析模型面数、顶点数等统计信息
              </p>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 p-5 rounded-xl">
              <div className="text-3xl font-bold text-primary-600 mb-2">04</div>
              <h4 className="font-semibold mb-2">转换导出</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                上传3MF后点击「转换并下载 STL」，一键获得可用于切片的STL文件
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            © 2026 3D模型查看器 · 支持3MF/STL格式 · 3MF→STL转换
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            所有解析与转换均在浏览器本地完成，无需上传到服务器，隐私安全
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
