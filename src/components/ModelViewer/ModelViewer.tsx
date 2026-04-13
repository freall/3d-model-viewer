import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Stats, Bounds, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ModelFile, ModelDimensions, ModelStats } from '../../types';
import { Loader2, Maximize2, RotateCw, ZoomIn, ZoomOut, Box as Cube, AlertCircle } from 'lucide-react';

interface ModelViewerProps {
  file: ModelFile | null;
  dimensions: ModelDimensions | null;
  stats: ModelStats | null;
  isLoading: boolean;
  error: string | null;
}

interface SceneContentProps {
  file: ModelFile | null;
  dimensions: ModelDimensions | null;
  showGrid?: boolean;
  showAxes?: boolean;
}

const ModelMesh: React.FC<{ dimensions: ModelDimensions | null }> = ({ dimensions }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      // 缓慢旋转模型
      meshRef.current.rotation.y += 0.002;
    }
  });

  if (!dimensions) return null;

  // 根据尺寸创建几何体
  const geometry = new THREE.BoxGeometry(
    dimensions.width,
    dimensions.height,
    dimensions.depth
  );

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        ref={materialRef}
        color={hovered ? '#3b82f6' : '#6366f1'}
        metalness={0.5}
        roughness={0.2}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
};

const GridHelper: React.FC<{ showGrid: boolean }> = ({ showGrid }) => {
  if (!showGrid) return null;
  
  return (
    <>
      <Grid
        args={[10, 10]}
        cellSize={10}
        cellThickness={1}
        cellColor="#6b7280"
        sectionSize={3}
        sectionThickness={1.5}
        sectionColor="#9ca3af"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={true}
      />
      <gridHelper args={[100, 100, '#4b5563', '#374151']} />
    </>
  );
};

const AxesHelper: React.FC<{ showAxes: boolean }> = ({ showAxes }) => {
  if (!showAxes) return null;
  
  return (
    <>
      <axesHelper args={[50]} />
      {/* X轴 - 红色 */}
      <arrowHelper
        args={[
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, 0, 0),
          30,
          0xff4444,
          2,
          1
        ]}
      />
      {/* Y轴 - 绿色 */}
      <arrowHelper
        args={[
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 0),
          30,
          0x44ff44,
          2,
          1
        ]}
      />
      {/* Z轴 - 蓝色 */}
      <arrowHelper
        args={[
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, 0),
          30,
          0x4444ff,
          2,
          1
        ]}
      />
    </>
  );
};

const Lighting: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-10, 10, -5]}
        intensity={0.4}
        color="#ffaa33"
      />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#ff4444" />
    </>
  );
};

const SceneContent: React.FC<SceneContentProps> = ({ dimensions, showGrid = true, showAxes = true }) => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // 当模型尺寸变化时，调整相机位置
  useEffect(() => {
    if (dimensions && controlsRef.current) {
      const maxDimension = Math.max(dimensions.width, dimensions.height, dimensions.depth);
      const distance = maxDimension * 3;
      
      camera.position.set(distance, distance, distance);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [dimensions, camera]);

  return (
    <>
      <Lighting />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        panSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={1}
        maxDistance={500}
        maxPolarAngle={Math.PI}
        minPolarAngle={0}
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
      />
      
      <Bounds fit clip observe margin={1.2}>
        <ModelMesh dimensions={dimensions} />
      </Bounds>
      
      <GridHelper showGrid={showGrid} />
      <AxesHelper showAxes={showAxes} />
    </>
  );
};

const ModelViewer: React.FC<ModelViewerProps> = ({
  file,
  dimensions,
  stats,
  isLoading,
  error,
}) => {
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleResetView = () => {
    // 这里稍后实现重置视图的逻辑
  };

  const handleZoomIn = () => {
    // 这里稍后实现放大逻辑
  };

  const handleZoomOut = () => {
    // 这里稍后实现缩小逻辑
  };

  return (
    <div className="relative scene-container" ref={canvasRef}>
      {/* 控制面板 */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-1">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded hover:bg-white/10 transition-colors ${showGrid ? 'text-green-400' : 'text-gray-400'}`}
            title="显示/隐藏网格"
          >
            <div className="w-5 h-5 grid grid-cols-2 gap-0.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-current" />
              ))}
            </div>
          </button>
          
          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`p-2 rounded hover:bg-white/10 transition-colors ${showAxes ? 'text-yellow-400' : 'text-gray-400'}`}
            title="显示/隐藏坐标轴"
          >
            <div className="w-5 h-5 relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-current transform -translate-y-1/2" />
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-current transform -translate-x-1/2" />
            </div>
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded hover:bg-white/10 transition-colors text-gray-300"
            title={isFullscreen ? "退出全屏" : "全屏"}
          >
            {isFullscreen ? <Maximize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 右侧控制面板 */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 flex gap-2">
          <button
            onClick={handleResetView}
            className="p-2 rounded hover:bg-white/10 transition-colors text-gray-300"
            title="重置视图"
          >
            <RotateCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded hover:bg-white/10 transition-colors text-gray-300"
            title="放大"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded hover:bg-white/10 transition-colors text-gray-300"
            title="缩小"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="absolute bottom-4 left-0 right-0 z-10 px-4">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {file && (
              <div className="flex items-center gap-2">
                <Cube className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">{file.name}</span>
              </div>
            )}
            
            {stats && (
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="text-gray-300">
                  顶点: <span className="text-green-400 font-medium">{stats.vertices.toLocaleString()}</span>
                </div>
                <div className="text-gray-300">
                  面数: <span className="text-yellow-400 font-medium">{stats.faces.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-400">
            透视视图
          </div>
        </div>
      </div>

      {/* 3D场景 */}
      <div className="w-full h-full">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-700 border-t-primary-500 rounded-full animate-spin mx-auto" />
                <Cube className="w-8 h-8 text-primary-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <p className="text-gray-300 font-medium">正在加载3D模型...</p>
              <p className="text-sm text-gray-400">解析模型数据中，请稍候</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-900/20 to-red-800/20">
            <div className="text-center space-y-3 p-8 bg-red-900/30 rounded-2xl backdrop-blur-sm">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-red-300">加载失败</h3>
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        ) : !file ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto">
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 border-2 border-dashed border-gray-600 rounded-2xl animate-pulse" />
                  <Cube className="w-10 h-10 text-gray-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">等待上传文件</h3>
                <p className="text-gray-400">请上传3MF或STL格式的3D模型文件</p>
              </div>
            </div>
          </div>
        ) : (
          <Canvas
            shadows
            camera={{ position: [20, 20, 20], fov: 50 }}
            gl={{ 
              antialias: true,
              alpha: false,
              powerPreference: "high-performance"
            }}
          >
            <Suspense
              fallback={
                <Html center>
                  <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                    <span className="text-white">加载3D场景...</span>
                  </div>
                </Html>
              }
            >
              <color attach="background" args={['#0f172a']} />
              <fog attach="fog" args={['#0f172a', 20, 100]} />
              
              <SceneContent
                file={file}
                dimensions={dimensions}
                showGrid={showGrid}
                showAxes={showAxes}
              />
              
              <Stats showPanel={0} className="stats" />
            </Suspense>
          </Canvas>
        )}
      </div>
    </div>
  );
};

export default ModelViewer;