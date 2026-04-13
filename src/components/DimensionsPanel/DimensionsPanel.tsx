import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Ruler, 
  Box as Cube, 
  AreaChart, 
  Maximize2, 
  Rotate3d,
  Layers,
  Hash,
  Activity,
  Calculator,
  Download,
  Copy,
  CheckCircle
} from 'lucide-react';
import { ModelDimensions, ModelStats } from '../../types';

interface DimensionsPanelProps {
  dimensions: ModelDimensions;
  stats: ModelStats | null;
  units: {
    length: 'mm' | 'cm' | 'm' | 'inch';
    volume: 'mm³' | 'cm³' | 'm³' | 'inch³';
  };
}

const DimensionsPanel: React.FC<DimensionsPanelProps> = ({ dimensions, stats, units }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<'mm' | 'cm' | 'inch'>(units.length as 'mm' | 'cm' | 'inch');

  const conversionFactors = {
    mm: { length: 1, volume: 1 },
    cm: { length: 0.1, volume: 0.001 },
    inch: { length: 0.0393701, volume: 0.0000610237 }
  };

  const convertLength = (value: number, unit: 'mm' | 'cm' | 'inch'): number => {
    const factor = conversionFactors[unit].length;
    return value * factor;
  };

  const convertVolume = (value: number, unit: 'mm' | 'cm' | 'inch'): number => {
    const factor = conversionFactors[unit].volume;
    return value * factor;
  };

  const formatValue = (value: number, decimals: number = 2): string => {
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const getUnitSymbol = (unit: 'mm' | 'cm' | 'inch'): string => {
    return unit === 'inch' ? '英寸' : unit;
  };

  const getVolumeUnitSymbol = (unit: 'mm' | 'cm' | 'inch'): string => {
    switch (unit) {
      case 'mm': return 'mm³';
      case 'cm': return 'cm³';
      case 'inch': return '立方英寸';
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadReport = () => {
    const report = `3D模型尺寸报告
====================
模型尺寸:
宽度: ${formatValue(convertLength(dimensions.width, selectedUnit))} ${getUnitSymbol(selectedUnit)}
高度: ${formatValue(convertLength(dimensions.height, selectedUnit))} ${getUnitSymbol(selectedUnit)}
深度: ${formatValue(convertLength(dimensions.depth, selectedUnit))} ${getUnitSymbol(selectedUnit)}
体积: ${formatValue(convertVolume(dimensions.volume, selectedUnit))} ${getVolumeUnitSymbol(selectedUnit)}
表面积: ${formatValue(convertLength(dimensions.surfaceArea, selectedUnit)**2)} ${getUnitSymbol(selectedUnit)}²

${stats ? `模型统计:
顶点数: ${stats.vertices}
面数: ${stats.faces}
三角形数: ${stats.triangles}
边数: ${stats.edges}
` : ''}
边界框:
最小点: X=${formatValue(convertLength(dimensions.boundingBox.min.x, selectedUnit))}, Y=${formatValue(convertLength(dimensions.boundingBox.min.y, selectedUnit))}, Z=${formatValue(convertLength(dimensions.boundingBox.min.z, selectedUnit))}
最大点: X=${formatValue(convertLength(dimensions.boundingBox.max.x, selectedUnit))}, Y=${formatValue(convertLength(dimensions.boundingBox.max.y, selectedUnit))}, Z=${formatValue(convertLength(dimensions.boundingBox.max.z, selectedUnit))}

报告生成时间: ${new Date().toLocaleString('zh-CN')}
    `;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '3d-model-dimensions-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const boundingBoxSize = {
    width: dimensions.boundingBox.max.x - dimensions.boundingBox.min.x,
    height: dimensions.boundingBox.max.y - dimensions.boundingBox.min.y,
    depth: dimensions.boundingBox.max.z - dimensions.boundingBox.min.z
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Ruler className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          尺寸与统计
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['mm', 'cm', 'inch'] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => setSelectedUnit(unit)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedUnit === unit
                    ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {unit === 'inch' ? '英寸' : unit}
              </button>
            ))}
          </div>
          <button
            onClick={handleDownloadReport}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            报告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 尺寸信息 */}
        <div>
          <h4 className="font-medium mb-4 text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Cube className="w-4 h-4" />
            模型尺寸
          </h4>
          <div className="space-y-4">
            {[
              { 
                label: '宽度 (X轴)', 
                value: dimensions.width, 
                icon: <Maximize2 className="w-4 h-4" />,
                field: 'width'
              },
              { 
                label: '高度 (Y轴)', 
                value: dimensions.height, 
                icon: <Maximize2 className="w-4 h-4" style={{ transform: 'rotate(90deg)' }} />,
                field: 'height'
              },
              { 
                label: '深度 (Z轴)', 
                value: dimensions.depth, 
                icon: <Maximize2 className="w-4 h-4" style={{ transform: 'rotate(45deg)' }} />,
                field: 'depth'
              },
              { 
                label: '体积', 
                value: dimensions.volume, 
                icon: <Cube className="w-4 h-4" />,
                field: 'volume',
                isVolume: true
              },
              { 
                label: '表面积', 
                value: dimensions.surfaceArea, 
                icon: <AreaChart className="w-4 h-4" />,
                field: 'surfaceArea'
              }
            ].map((item) => (
              <motion.div
                key={item.field}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-blue-100 dark:from-primary-900/30 dark:to-blue-900/30 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-300">
                      {item.label}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {item.isVolume 
                        ? `${formatValue(convertVolume(item.value, selectedUnit))} ${getVolumeUnitSymbol(selectedUnit)}`
                        : `${formatValue(convertLength(item.value, selectedUnit))} ${getUnitSymbol(selectedUnit)}`
                      }
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(
                    item.isVolume
                      ? `${formatValue(convertVolume(item.value, selectedUnit))} ${getVolumeUnitSymbol(selectedUnit)}`
                      : `${formatValue(convertLength(item.value, selectedUnit))} ${getUnitSymbol(selectedUnit)}`,
                    item.field
                  )}
                  className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="复制到剪贴板"
                >
                  {copiedField === item.field ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 统计信息 */}
        <div>
          <h4 className="font-medium mb-4 text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            模型统计
          </h4>
          
          {stats ? (
            <div className="space-y-4">
              {[
                { label: '顶点数', value: stats.vertices, icon: <Hash className="w-4 h-4" />, color: 'from-blue-100 to-cyan-100' },
                { label: '面数', value: stats.faces, icon: <Layers className="w-4 h-4" />, color: 'from-green-100 to-emerald-100' },
                { label: '三角形数', value: stats.triangles, icon: <Rotate3d className="w-4 h-4" />, color: 'from-purple-100 to-pink-100' },
                { label: '边数', value: stats.edges, icon: <Calculator className="w-4 h-4" />, color: 'from-yellow-100 to-orange-100' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 bg-gradient-to-br dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} dark:from-gray-600 dark:to-gray-700 flex items-center justify-center`}>
                        {stat.icon}
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
                        <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                          {stat.value.toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* 边界框信息 */}
              <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/30 dark:to-gray-800/30 rounded-xl">
                <h5 className="font-medium mb-3 text-gray-700 dark:text-gray-300">边界框</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-white/50 dark:bg-gray-800/30 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400">最小点</div>
                    <div className="font-mono text-sm">
                      X: {formatValue(convertLength(dimensions.boundingBox.min.x, selectedUnit))}
                    </div>
                    <div className="font-mono text-sm">
                      Y: {formatValue(convertLength(dimensions.boundingBox.min.y, selectedUnit))}
                    </div>
                    <div className="font-mono text-sm">
                      Z: {formatValue(convertLength(dimensions.boundingBox.min.z, selectedUnit))}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-white/50 dark:bg-gray-800/30 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400">最大点</div>
                    <div className="font-mono text-sm">
                      X: {formatValue(convertLength(dimensions.boundingBox.max.x, selectedUnit))}
                    </div>
                    <div className="font-mono text-sm">
                      Y: {formatValue(convertLength(dimensions.boundingBox.max.y, selectedUnit))}
                    </div>
                    <div className="font-mono text-sm">
                      Z: {formatValue(convertLength(dimensions.boundingBox.max.z, selectedUnit))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
                  实际尺寸: {formatValue(boundingBoxSize.width)} × {formatValue(boundingBoxSize.height)} × {formatValue(boundingBoxSize.depth)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>正在计算模型统计信息...</p>
            </div>
          )}
        </div>
      </div>

      {/* 尺寸比例可视化 */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="font-medium mb-4 text-gray-700 dark:text-gray-300">尺寸比例</h4>
        <div className="flex items-end justify-between h-24">
          {[
            { label: '宽度', value: dimensions.width, color: 'bg-blue-500' },
            { label: '高度', value: dimensions.height, color: 'bg-green-500' },
            { label: '深度', value: dimensions.depth, color: 'bg-purple-500' }
          ].map((dim, index) => {
            const maxValue = Math.max(dimensions.width, dimensions.height, dimensions.depth);
            const heightPercentage = (dim.value / maxValue) * 80;
            
            return (
              <motion.div
                key={dim.label}
                initial={{ height: 0 }}
                animate={{ height: `${heightPercentage}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center flex-1 mx-1"
              >
                <div className={`w-full ${dim.color} rounded-t-lg`} style={{ height: '100%' }} />
                <div className="mt-2 text-center">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {dim.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatValue(convertLength(dim.value, selectedUnit))} {getUnitSymbol(selectedUnit)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DimensionsPanel;