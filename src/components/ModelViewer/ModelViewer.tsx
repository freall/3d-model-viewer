import React, { Suspense, useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ModelFile, ModelDimensions, ModelStats, ModelGeometry } from '../../types';
import { Loader2, Maximize2, RotateCw, Box as Cube, AlertCircle } from 'lucide-react';

interface ModelViewerProps {
  file: ModelFile | null;
  dimensions: ModelDimensions | null;
  stats: ModelStats | null;
  geometry: ModelGeometry | null;
  isLoading: boolean;
  error: string | null;
}

// ─── 渲染真实网格 ─────────────────────────────────────────────────
const RealModelMesh: React.FC<{ geometry: ModelGeometry }> = ({ geometry }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const threeGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // 设置顶点位置
    geo.setAttribute('position', new THREE.BufferAttribute(geometry.position, 3));

    // 设置法线
    if (geometry.normal && geometry.normal.length > 0) {
      geo.setAttribute('normal', new THREE.BufferAttribute(geometry.normal, 3));
    }

    // 设置索引
    if (geometry.index && geometry.index.length > 0) {
      geo.setIndex(new THREE.BufferAttribute(geometry.index, 1));
    }

    // 如果没有法线，自动计算
    if (!geometry.normal || geometry.normal.length === 0) {
      geo.computeVertexNormals();
    }

    // 居中几何体
    geo.computeBoundingBox();
    const center = new THREE.Vector3();
    geo.boundingBox!.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);

    return geo;
  }, [geometry]);

  // 清理
  useEffect(() => {
    return () => {
      threeGeometry.dispose();
    };
  }, [threeGeometry]);

  return (
    <mesh ref={meshRef} geometry={threeGeometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#6366f1"
        metalness={0.2}
        roughness={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// ─── 相机自适应控制器 ─────────────────────────────────────────────
const CameraController: React.FC<{ dimensions: ModelDimensions | null }> = ({ dimensions }) => {
  const { camera, controls } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!dimensions) return;

    const maxDim = Math.max(dimensions.width, dimensions.height, dimensions.depth);
    const dist = maxDim * 2.5;

    camera.position.set(dist, dist * 0.8, dist);
    camera.near = maxDim * 0.001;
    camera.far = maxDim * 100;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();

    const ctrl = controlsRef.current || (controls as any);
    if (ctrl) {
      ctrl.target.set(0, 0, 0);
      ctrl.minDistance = maxDim * 0.1;
      ctrl.maxDistance = maxDim * 20;
      ctrl.update();
    }
  }, [dimensions, camera, controls]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.6}
      zoomSpeed={1.0}
      panSpeed={0.8}
      maxPolarAngle={Math.PI}
    />
  );
};

// ─── 灯光 ─────────────────────────────────────────────────────────
const Lighting: React.FC = () => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[10, 15, 10]} intensity={1.0} castShadow />
    <directionalLight position={[-10, 10, -5]} intensity={0.5} color="#c0c8ff" />
    <directionalLight position={[0, -10, 0]}  intensity={0.2} color="#fff0cc" />
  </>
);

// ─── 网格地面 ─────────────────────────────────────────────────────
const GridFloor: React.FC<{ size: number }> = ({ size }) => {
  const gridSize = Math.max(size * 4, 100);
  const divisions = 20;
  return (
    <gridHelper
      args={[gridSize, divisions, '#444466', '#333344']}
      position={[0, -size / 2, 0]}
    />
  );
};

// ─── 主场景 ───────────────────────────────────────────────────────
const Scene: React.FC<{
  geometry: ModelGeometry | null;
  dimensions: ModelDimensions | null;
  showGrid: boolean;
  showAxes: boolean;
}> = ({ geometry, dimensions, showGrid, showAxes }) => {
  const maxDim = dimensions
    ? Math.max(dimensions.width, dimensions.height, dimensions.depth)
    : 100;

  return (
    <>
      <Lighting />
      <CameraController dimensions={dimensions} />

      {geometry && <RealModelMesh geometry={geometry} />}

      {showGrid && <GridFloor size={maxDim} />}
      {showAxes && <axesHelper args={[maxDim * 1.2]} />}
    </>
  );
};

// ─── 组件主体 ─────────────────────────────────────────────────────
const ModelViewer: React.FC<ModelViewerProps> = ({
  file,
  dimensions,
  stats,
  geometry,
  isLoading,
  error,
}) => {
  const [showGrid, setShowGrid] = React.useState(true);
  const [showAxes, setShowAxes] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!canvasRef.current) return;
    if (!document.fullscreenElement) {
      canvasRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="relative scene-container" ref={canvasRef}>
      {/* 左侧控制按钮 */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-1">
          {/* 网格开关 */}
          <button
            onClick={() => setShowGrid(v => !v)}
            className={`p-2 rounded hover:bg-white/10 transition-colors ${showGrid ? 'text-green-400' : 'text-gray-500'}`}
            title="显示/隐藏网格"
          >
            <div className="w-5 h-5 grid grid-cols-2 gap-0.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-current" />
              ))}
            </div>
          </button>
          {/* 坐标轴开关 */}
          <button
            onClick={() => setShowAxes(v => !v)}
            className={`p-2 rounded hover:bg-white/10 transition-colors ${showAxes ? 'text-yellow-400' : 'text-gray-500'}`}
            title="显示/隐藏坐标轴"
          >
            <div className="w-5 h-5 relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-current -translate-y-1/2" />
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-current -translate-x-1/2" />
            </div>
          </button>
          {/* 全屏按钮 */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded hover:bg-white/10 transition-colors text-gray-300"
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 右侧操作提示 */}
      {file && !isLoading && !error && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2">
            <RotateCw className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}

      {/* 底部状态栏 */}
      <div className="absolute bottom-4 left-0 right-0 z-10 px-4">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {file && (
              <div className="flex items-center gap-2">
                <Cube className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300 max-w-xs truncate">{file.name}</span>
              </div>
            )}
            {stats && (
              <div className="hidden md:flex items-center gap-4 text-sm">
                <span className="text-gray-400">顶点: <span className="text-green-400 font-medium">{stats.vertices.toLocaleString()}</span></span>
                <span className="text-gray-400">面数: <span className="text-yellow-400 font-medium">{stats.faces.toLocaleString()}</span></span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">拖拽旋转 · 滚轮缩放 · 右键平移</div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="w-full h-full">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin mx-auto" />
              <p className="text-gray-300 font-medium">正在解析3D模型...</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-900/20 to-red-800/20">
            <div className="text-center space-y-3 p-8 bg-red-900/30 rounded-2xl">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <h3 className="text-xl font-semibold text-red-300">加载失败</h3>
              <p className="text-red-200 text-sm max-w-sm">{error}</p>
            </div>
          </div>
        ) : !file || !geometry ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto border-2 border-dashed border-gray-600 rounded-2xl flex items-center justify-center">
                <Cube className="w-10 h-10 text-gray-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-300 mb-1">等待上传文件</h3>
                <p className="text-gray-500 text-sm">支持 3MF / STL 格式</p>
              </div>
            </div>
          </div>
        ) : (
          <Canvas
            shadows
            camera={{ position: [100, 80, 100], fov: 45 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          >
            <Suspense fallback={
              <Html center>
                <div className="flex items-center gap-2 bg-black/80 px-4 py-2 rounded-lg">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  <span className="text-white text-sm">加载场景...</span>
                </div>
              </Html>
            }>
              <color attach="background" args={['#0f172a']} />
              <Scene
                geometry={geometry}
                dimensions={dimensions}
                showGrid={showGrid}
                showAxes={showAxes}
              />
            </Suspense>
          </Canvas>
        )}
      </div>
    </div>
  );
};

export default ModelViewer;
