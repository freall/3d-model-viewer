# 3D模型查看器 - 部署指南

## 🚀 本地开发

### 环境要求
- Node.js 18+ 
- npm 或 pnpm 包管理器
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```
开发服务器将在 http://localhost:3000 启动

### 构建生产版本
```bash
npm run build
```
构建产物将输出到 `dist/` 目录

### 预览构建结果
```bash
npm run preview
```

## 🌐 部署到生产环境

### 静态文件部署
这是一个纯前端应用，可以部署到任何静态文件托管服务：

#### 1. Vercel（推荐）
```bash
# 全局安装 Vercel CLI
npm i -g vercel

# 部署项目
vercel
```

#### 2. Netlify
1. 将项目推送到 GitHub 仓库
2. 在 Netlify 控制台导入仓库
3. 构建命令：`npm run build`
4. 发布目录：`dist`

#### 3. GitHub Pages
1. 将项目推送到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 源目录选择：`gh-pages` 分支或 `dist` 目录

#### 4. Cloudflare Pages
1. 导入 GitHub 仓库
2. 构建命令：`npm run build`
3. 输出目录：`dist`
4. 环境变量：无需特殊配置

### Docker 部署
创建 `Dockerfile`：
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

创建 `nginx.conf`：
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

构建并运行：
```bash
docker build -t 3d-model-viewer .
docker run -p 80:80 3d-model-viewer
```

## 🔧 环境配置

### 开发环境变量
创建 `.env.development`：
```
VITE_APP_NAME=3D模型查看器（开发版）
VITE_MAX_FILE_SIZE=104857600  # 100MB
```

### 生产环境变量
创建 `.env.production`：
```
VITE_APP_NAME=3D模型查看器
VITE_MAX_FILE_SIZE=104857600
```

### 配置说明
- `VITE_MAX_FILE_SIZE`：最大文件上传大小（字节）
- `VITE_APP_NAME`：应用名称
- `VITE_ANALYTICS_ID`：Google Analytics ID（可选）

## 📊 性能优化

### 构建优化
1. **代码分割**：Vite 自动支持
2. **Tree Shaking**：自动移除未使用的代码
3. **图片优化**：建议使用 WebP 格式

### 运行时优化
1. **懒加载**：Three.js 组件按需加载
2. **Web Worker**：复杂计算在工作线程中执行
3. **缓存策略**：Service Worker 缓存静态资源

### 网络优化
1. **CDN 部署**：使用 Cloudflare 或 Netlify CDN
2. **HTTP/2**：启用 HTTP/2 协议
3. **压缩**：启用 Brotli 或 Gzip 压缩

## 🛡️ 安全考虑

### 客户端安全
1. **文件处理**：所有文件处理在浏览器本地完成
2. **沙箱环境**：Three.js 在 WebGL 沙箱中运行
3. **内容安全策略**：
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: blob:; 
               connect-src 'self'">
```

### 部署安全
1. **HTTPS**：强制使用 HTTPS
2. **CORS**：配置适当的 CORS 策略
3. **安全头**：
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## 📱 移动端优化

### 响应式设计
- 已支持移动端触摸操作
- 自适应布局
- 触控目标大小优化（>44px）

### PWA 支持
创建 `manifest.json`：
```json
{
  "name": "3D模型查看器",
  "short_name": "3D查看器",
  "description": "上传并查看3MF/STL模型文件",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🔍 监控与分析

### 错误监控
集成 Sentry：
```bash
npm install @sentry/react @sentry/tracing
```

### 使用统计
集成 Google Analytics 4：
```javascript
// 在 main.tsx 中添加
import ReactGA from 'react-ga4';
ReactGA.initialize('G-XXXXXXXXXX');
```

## 📈 扩展功能

### 后端集成（可选）
如果需要保存用户模型，可以集成后端：

1. **API 端点**：
   - `POST /api/upload` - 上传模型
   - `GET /api/models` - 获取用户模型列表
   - `GET /api/models/:id` - 获取特定模型

2. **数据库**：MongoDB 或 PostgreSQL
3. **存储**：AWS S3 或类似服务

### 第三方服务
1. **3D打印服务集成**：连接 3D 打印 API
2. **模型库集成**：连接 Thingiverse 或 MyMiniFactory
3. **AI分析**：集成机器学习模型分析

## 🚨 故障排除

### 常见问题
1. **WebGL 不支持**
   - 检查浏览器 WebGL 支持
   - 更新显卡驱动程序
   - 尝试使用 Chrome 或 Firefox

2. **文件上传失败**
   - 检查文件格式（仅支持 3MF/STL）
   - 检查文件大小（最大 100MB）
   - 检查网络连接

3. **模型渲染异常**
   - 检查模型文件是否损坏
   - 尝试重新上传
   - 检查 Three.js 控制台错误

### 调试工具
1. **Three.js Inspector**：安装浏览器扩展
2. **React DevTools**：调试 React 组件
3. **Redux DevTools**：调试状态管理

## 📞 支持与维护

### 更新依赖
```bash
npm outdated  # 检查过时依赖
npm update    # 更新到最新版本
npm audit     # 安全检查
```

### 代码质量
```bash
npm run lint   # ESLint 检查
npm run format # Prettier 格式化
```

### 测试
```bash
npm test       # 运行测试
npm run build  # 确保构建成功
```

## 🎯 未来改进

### 短期计划
1. 完整实现 3MF 解析
2. 添加更多测量工具
3. 改进移动端体验

### 长期计划
1. 离线模式支持
2. 模型编辑功能
3. 3D打印切片预览

---

**注意**：这是一个纯前端应用，所有文件处理都在浏览器本地完成，确保用户数据隐私。部署时不需要服务器端处理能力。