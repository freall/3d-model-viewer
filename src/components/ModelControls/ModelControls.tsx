import React, { useState } from 'react';
import { 
  Grid3x3, 
  Axis3d, 
  Sun, 
  Moon, 
  Zap, 
  Eye, 
  Box, 
  Rotate3d,
  Trash2,
  Download,
  Settings,
  Palette
} from 'lucide-react';

interface ModelControlsProps {
  onClear: () => void;
  showGrid: boolean;
  onShowGridChange: (show: boolean) => void;
  showAxes: boolean;
  onShowAxesChange: (show: boolean) => void;
  lighting: 'default' | 'studio' | 'outdoor';
  onLightingChange: (lighting: 'default' | 'studio' | 'outdoor') => void;
  onExport?: () => void;
}

const ModelControls: React.FC<ModelControlsProps> = ({
  onClear,
  showGrid,
  onShowGridChange,
  showAxes,
  onShowAxesChange,
  lighting,
  onLightingChange,
  onExport,
}) => {
  const [showWireframe, setShowWireframe] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(false);
  const [showNormals, setShowNormals] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<'dark' | 'light' | 'gradient'>('dark');
  const [rotationSpeed, setRotationSpeed] = useState(0);

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      alert('导出功能将在后续版本中实现');
    }
  };

  const handleBackgroundChange = (color: 'dark' | 'light' | 'gradient') => {
    setBackgroundColor(color);
    // 这里稍后实现背景颜色切换逻辑
  };

  const handleRotationSpeedChange = (speed: number) => {
    setRotationSpeed(speed);
    // 这里稍后实现自动旋转逻辑
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          模型控制
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="清除模型"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
            title="导出模型"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 显示控制 */}
        <div>
          <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            显示控制
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onShowGridChange(!showGrid)}
              className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                showGrid 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-300 dark:border-primary-700' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Grid3x3 className="w-5 h-5" />
              <span className="text-sm font-medium">网格</span>
            </button>

            <button
              onClick={() => onShowAxesChange(!showAxes)}
              className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                showAxes 
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Axis3d className="w-5 h-5" />
              <span className="text-sm font-medium">坐标轴</span>
            </button>

            <button
              onClick={() => setShowWireframe(!showWireframe)}
              className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                showWireframe 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="w-5 h-5 relative">
                <div className="absolute inset-0 border border-current rounded" />
                <div className="absolute inset-1 border border-current rounded" />
              </div>
              <span className="text-sm font-medium">线框</span>
            </button>

            <button
              onClick={() => setShowBoundingBox(!showBoundingBox)}
              className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                showBoundingBox 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-700' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Box className="w-5 h-5" />
              <span className="text-sm font-medium">边界框</span>
            </button>
          </div>
        </div>

        {/* 光照设置 */}
        <div>
          <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Sun className="w-4 h-4" />
            光照设置
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {(['default', 'studio', 'outdoor'] as const).map((light) => (
              <button
                key={light}
                onClick={() => onLightingChange(light)}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  lighting === light 
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-300 dark:border-primary-700' 
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {light === 'default' && <Zap className="w-4 h-4" />}
                {light === 'studio' && <Sun className="w-4 h-4" />}
                {light === 'outdoor' && <Moon className="w-4 h-4" />}
                <span className="text-xs font-medium">
                  {light === 'default' ? '默认' : light === 'studio' ? '工作室' : '户外'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 背景设置 */}
        <div>
          <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            背景设置
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {(['dark', 'light', 'gradient'] as const).map((color) => (
              <button
                key={color}
                onClick={() => handleBackgroundChange(color)}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  backgroundColor === color 
                    ? 'ring-2 ring-offset-2 ring-primary-500' 
                    : 'hover:opacity-90'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${
                  color === 'dark' ? 'bg-gray-900' :
                  color === 'light' ? 'bg-gray-100' :
                  'bg-gradient-to-br from-blue-500 to-purple-500'
                }`} />
                <span className="text-xs font-medium mt-1">
                  {color === 'dark' ? '深色' : color === 'light' ? '浅色' : '渐变'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 自动旋转 */}
        <div>
          <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Rotate3d className="w-4 h-4" />
            自动旋转
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">旋转速度</span>
              <span className="text-sm font-medium">{rotationSpeed}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={rotationSpeed}
              onChange={(e) => handleRotationSpeedChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>停止</span>
              <span>慢</span>
              <span>中</span>
              <span>快</span>
            </div>
          </div>
        </div>

        {/* 法线显示 */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 relative">
                <div className="absolute inset-0 border border-gray-400 rounded" />
                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">显示法线</span>
            </div>
            <button
              onClick={() => setShowNormals(!showNormals)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showNormals ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showNormals ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            显示模型表面的法线方向，用于检查模型质量
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModelControls;