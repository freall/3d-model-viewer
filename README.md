# 3D模型查看器

这是一个能够上传3MF或STL文件并显示3D模型和尺寸的网站。

## 功能特性

### 核心功能
1. **文件上传**
   - 支持3MF格式（.3mf）
   - 支持STL格式（.stl，二进制和ASCII）
   - 拖拽上传和点击选择文件
   - 文件大小限制：100MB

2. **3D模型渲染**
   - 使用Three.js实时渲染3D模型
   - 支持模型旋转、缩放、平移
   - 自动调整相机视角
   - 多光源照明
   - 网格显示和隐藏

3. **尺寸测量和显示**
   - 自动计算模型边界框尺寸
   - 显示长度、宽度、高度
   - 实时尺寸测量工具
   - 单位转换（毫米/厘米/英寸）

4. **模型分析**
   - 面数统计
   - 顶点数统计
   - 体积估算（对闭合模型）
   - 表面积计算

### 用户界面
- 响应式设计，支持桌面和移动端
- 文件上传状态显示
- 加载进度条
- 模型信息面板
- 控制面板（旋转、视图、网格等）
- 暗黑/明亮主题

## 技术栈

### 前端
- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Three.js** + **@react-three/fiber** - 3D渲染
- **@react-three/drei** - Three.js辅助组件
- **@react-three/postprocessing** - 后期处理效果
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具
- **Framer Motion** - 动画效果

### 3D处理库
- **three-stdlib** - Three.js标准库
- **stl-parser** - STL文件解析
- **3mf-loader** - 3MF文件加载

### 开发工具
- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Husky** - Git钩子

## 快速开始

### 安装依赖
```bash
npm install
```

### 开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览构建
```bash
npm run preview
```

## 项目结构

```
src/
├── components/
│   ├── ModelViewer/         # 3D模型查看器主组件
│   ├── FileUploader/        # 文件上传组件
│   ├── ModelControls/       # 模型控制面板
│   ├── DimensionsPanel/     # 尺寸显示面板
│   └── UI/                  # 通用UI组件
├── hooks/
│   ├── useModelLoader.ts    # 模型加载钩子
│   ├── useDimensions.ts     # 尺寸计算钩子
│   └── useFileProcessor.ts  # 文件处理钩子
├── utils/
│   ├── fileParser.ts        # 文件解析工具
│   ├── stlParser.ts         # STL解析器
│   ├── threeMFLoader.ts     # 3MF加载器
│   └── geometryUtils.ts     # 几何工具
├── types/
│   └── index.ts            # TypeScript类型定义
├── App.tsx                 # 主应用组件
└── main.tsx               # 入口文件
```

## API接口

### 本地解析
所有文件解析都在客户端完成，无需后端服务。

### 文件解析流程
1. 用户上传文件
2. 检测文件类型（3MF或STL）
3. 读取文件内容
4. 解析为Three.js几何体
5. 渲染到场景中

## 部署

### 静态部署
网站可以部署到任何静态文件托管服务：
- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages

### 自定义域名
设置CNAME记录指向部署服务。

## 浏览器支持
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 许可证
MIT License