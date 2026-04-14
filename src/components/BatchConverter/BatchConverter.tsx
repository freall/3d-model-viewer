import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowDownToLine,
  PackageOpen,
  Trash2,
  FolderOpen,
  Download,
} from 'lucide-react';
import { parseFile } from '../../utils/fileParser';
import { geometryToSTLBuffer } from '../../utils/stlExporter';

// ─── 类型定义 ──────────────────────────────────────────────
type ConvertStatus = 'pending' | 'converting' | 'done' | 'error';

interface BatchItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: ConvertStatus;
  errorMsg?: string;
  stlBuffer?: ArrayBuffer;
  triangleCount?: number;
}

// ─── 工具函数 ─────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function baseName(filename: string): string {
  return filename.replace(/\.(3mf|stl)$/i, '');
}

function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// 将所有 STL buffer 打包为 ZIP 下载（纯手写，不依赖额外库）
// 采用简单 ZIP STORE（不压缩，减少CPU开销）
function downloadAllAsZip(items: BatchItem[]) {
  const doneItems = items.filter((i) => i.status === 'done' && i.stlBuffer);
  if (doneItems.length === 0) return;

  // 构建 ZIP（Local File Headers + Central Directory）
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const item of doneItems) {
    const stlName = `${baseName(item.name)}.stl`;
    const nameBytes = encoder.encode(stlName);
    const fileData = new Uint8Array(item.stlBuffer!);
    const fileSize = fileData.byteLength;

    // CRC-32 (simplified: use 0 — some unzippers accept it for STORE)
    const crc32 = computeCRC32(fileData);

    // Local File Header
    const localHeader = new DataView(new ArrayBuffer(30 + nameBytes.length));
    localHeader.setUint32(0, 0x04034b50, true);   // signature
    localHeader.setUint16(4, 20, true);            // version needed
    localHeader.setUint16(6, 0, true);             // flags
    localHeader.setUint16(8, 0, true);             // compression (STORE)
    localHeader.setUint16(10, 0, true);            // mod time
    localHeader.setUint16(12, 0, true);            // mod date
    localHeader.setUint32(14, crc32, true);        // CRC-32
    localHeader.setUint32(18, fileSize, true);     // compressed size
    localHeader.setUint32(22, fileSize, true);     // uncompressed size
    localHeader.setUint16(26, nameBytes.length, true); // name length
    localHeader.setUint16(28, 0, true);            // extra length
    const lhBytes = new Uint8Array(localHeader.buffer);
    for (let i = 0; i < nameBytes.length; i++) lhBytes[30 + i] = nameBytes[i];

    localHeaders.push(lhBytes);
    localHeaders.push(fileData);

    // Central Directory Header
    const cdHeader = new DataView(new ArrayBuffer(46 + nameBytes.length));
    cdHeader.setUint32(0, 0x02014b50, true);    // signature
    cdHeader.setUint16(4, 20, true);            // version made by
    cdHeader.setUint16(6, 20, true);            // version needed
    cdHeader.setUint16(8, 0, true);             // flags
    cdHeader.setUint16(10, 0, true);            // compression
    cdHeader.setUint16(12, 0, true);            // mod time
    cdHeader.setUint16(14, 0, true);            // mod date
    cdHeader.setUint32(16, crc32, true);        // CRC-32
    cdHeader.setUint32(20, fileSize, true);     // compressed size
    cdHeader.setUint32(24, fileSize, true);     // uncompressed size
    cdHeader.setUint16(28, nameBytes.length, true); // name length
    cdHeader.setUint16(30, 0, true);            // extra length
    cdHeader.setUint16(32, 0, true);            // comment length
    cdHeader.setUint16(34, 0, true);            // disk start
    cdHeader.setUint16(36, 0, true);            // internal attrs
    cdHeader.setUint32(38, 0, true);            // external attrs
    cdHeader.setUint32(42, offset, true);       // relative offset
    const cdBytes = new Uint8Array(cdHeader.buffer);
    for (let i = 0; i < nameBytes.length; i++) cdBytes[46 + i] = nameBytes[i];

    centralHeaders.push(cdBytes);
    offset += lhBytes.byteLength + fileData.byteLength;
  }

  const cdOffset = offset;
  let cdSize = 0;
  centralHeaders.forEach((h) => (cdSize += h.byteLength));

  // End of Central Directory
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);            // signature
  eocd.setUint16(4, 0, true);                     // disk number
  eocd.setUint16(6, 0, true);                     // disk with CD
  eocd.setUint16(8, doneItems.length, true);      // entries on this disk
  eocd.setUint16(10, doneItems.length, true);     // total entries
  eocd.setUint32(12, cdSize, true);               // CD size
  eocd.setUint32(16, cdOffset, true);             // CD offset
  eocd.setUint16(20, 0, true);                    // comment length

  // 合并所有部分
  const parts: Uint8Array[] = [...localHeaders, ...centralHeaders, new Uint8Array(eocd.buffer)];
  const totalSize = parts.reduce((s, p) => s + p.byteLength, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.byteLength;
  }

  downloadBuffer(result.buffer, `batch_stl_${Date.now()}.zip`);
}

/** 简单的 CRC-32 实现 */
function computeCRC32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── 主组件 ──────────────────────────────────────────────
const BatchConverter: React.FC = () => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 添加文件（过滤非3MF）
  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const valid = fileArray.filter((f) => f.name.toLowerCase().endsWith('.3mf'));
    if (valid.length === 0) return;

    setItems((prev) => {
      const existingNames = new Set(prev.map((i) => i.name + i.size));
      const newItems: BatchItem[] = valid
        .filter((f) => !existingNames.has(f.name + f.size))
        .map((f) => ({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          file: f,
          name: f.name,
          size: f.size,
          status: 'pending',
        }));
      return [...prev, ...newItems];
    });
  }, []);

  // 拖拽事件
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  const onDragLeave = useCallback(() => setIsDragOver(false), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  // 文件选择
  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      e.target.value = '';
    },
    [addFiles],
  );

  // 移除单个
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // 清空全部
  const clearAll = useCallback(() => setItems([]), []);

  // 下载单个
  const downloadItem = useCallback((item: BatchItem) => {
    if (!item.stlBuffer) return;
    downloadBuffer(item.stlBuffer, `${baseName(item.name)}.stl`);
  }, []);

  // ─── 核心：批量转换 ────────────────────────────────────
  const startConvert = useCallback(async () => {
    const pendingIds = items.filter((i) => i.status === 'pending').map((i) => i.id);
    if (pendingIds.length === 0) return;

    setIsConverting(true);

    for (const id of pendingIds) {
      // 标记为 converting
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'converting' } : i)),
      );

      const item = items.find((i) => i.id === id);
      if (!item) continue;

      try {
        const result = await parseFile(item.file);
        if (!result.success || !result.geometry) {
          throw new Error(result.error || '解析失败');
        }

        const buffer = geometryToSTLBuffer(result.geometry);
        const triCount = result.stats?.triangles ?? 0;

        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, status: 'done', stlBuffer: buffer, triangleCount: triCount }
              : i,
          ),
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status: 'error',
                  errorMsg: err instanceof Error ? err.message : '未知错误',
                }
              : i,
          ),
        );
      }
    }

    setIsConverting(false);
  }, [items]);

  // 统计
  const totalCount = items.length;
  const doneCount = items.filter((i) => i.status === 'done').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const hasDone = doneCount > 0;
  const hasItems = totalCount > 0;

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <PackageOpen className="w-6 h-6 text-indigo-500" />
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            批量 3MF → STL 转换
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            一次性添加多个 .3mf 文件，批量转换后统一打包下载
          </p>
        </div>
      </div>

      {/* 拖拽上传区 */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
          ${isDragOver
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 scale-[1.01]'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".3mf"
          multiple
          onChange={onFileChange}
          className="hidden"
        />
        <Upload className="w-10 h-10 mx-auto mb-3 text-indigo-400" />
        <p className="text-base font-medium text-gray-700 dark:text-gray-200">
          拖拽 3MF 文件到此处，或点击选择文件
        </p>
        <p className="text-sm text-gray-400 mt-1">
          支持同时选择多个 .3mf 文件 · 单文件最大 100 MB
        </p>
      </div>

      {/* 操作栏 */}
      <AnimatePresence>
        {hasItems && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-wrap gap-3 items-center justify-between"
          >
            {/* 统计 */}
            <div className="flex gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                共 <strong>{totalCount}</strong> 个文件
              </span>
              {doneCount > 0 && (
                <span className="text-green-600 dark:text-green-400">
                  ✓ 已完成 {doneCount}
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-red-500">✗ 失败 {errorCount}</span>
              )}
              {pendingCount > 0 && (
                <span className="text-gray-400">待转换 {pendingCount}</span>
              )}
            </div>

            {/* 按钮组 */}
            <div className="flex gap-2">
              {hasDone && (
                <button
                  onClick={() => downloadAllAsZip(items)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium shadow transition-all"
                >
                  <Download className="w-4 h-4" />
                  打包下载全部 STL
                </button>
              )}

              {pendingCount > 0 && (
                <button
                  onClick={startConvert}
                  disabled={isConverting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shadow transition-all"
                >
                  {isConverting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      转换中…
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-4 h-4" />
                      开始批量转换
                    </>
                  )}
                </button>
              )}

              <button
                onClick={clearAll}
                disabled={isConverting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm transition-all"
              >
                <Trash2 className="w-4 h-4" />
                清空
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 文件列表 */}
      <AnimatePresence>
        {hasItems && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                  ${item.status === 'done'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : item.status === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : item.status === 'converting'
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
              >
                {/* 状态图标 */}
                <div className="flex-shrink-0">
                  {item.status === 'pending' && (
                    <FolderOpen className="w-5 h-5 text-gray-400" />
                  )}
                  {item.status === 'converting' && (
                    <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                  )}
                  {item.status === 'done' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatSize(item.size)}
                    {item.status === 'done' && item.triangleCount != null && (
                      <span className="ml-2 text-green-600 dark:text-green-400">
                        · {item.triangleCount.toLocaleString()} 个三角形
                      </span>
                    )}
                    {item.status === 'done' && item.stlBuffer && (
                      <span className="ml-2 text-green-600 dark:text-green-400">
                        → STL {formatSize(item.stlBuffer.byteLength)}
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="ml-2 text-red-500">{item.errorMsg}</span>
                    )}
                  </p>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.status === 'done' && (
                    <button
                      onClick={() => downloadItem(item)}
                      title="下载此 STL"
                      className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 text-green-600 transition-colors"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={item.status === 'converting'}
                    title="移除"
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 空状态提示 */}
      {!hasItems && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm">
          暂无文件，请先添加 .3mf 文件
        </div>
      )}

      {/* 进度总览条 */}
      <AnimatePresence>
        {hasItems && totalCount > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-400 to-green-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((doneCount + errorCount) / totalCount) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BatchConverter;
