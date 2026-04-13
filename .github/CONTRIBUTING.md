# 贡献指南

感谢你考虑为3D模型查看器项目做出贡献！本指南将帮助你开始贡献。

## 如何贡献

### 报告问题
如果你发现了一个问题，请在GitHub上创建一个Issue：
1. 在创建Issue前，请先搜索是否已有相关问题
2. 使用Issue模板提供详细信息
3. 如果可能，请提供重现步骤和截图

### 功能请求
如果你有一个新功能的想法：
1. 检查是否已有相关功能请求
2. 详细描述功能的使用场景和好处
3. 提供实现建议（如果可能）

### 提交代码
1. Fork仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个Pull Request

## 开发环境设置

### 前提条件
- Node.js 20 或更高版本
- npm 10 或更高版本

### 安装步骤
```bash
# 克隆仓库
git clone https://github.com/freall/3d-model-viewer.git
cd 3d-model-viewer

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 开发工作流
```bash
# 运行开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 代码检查和格式化
npm run lint
npm run format

# 类型检查
npx tsc --noEmit
```

## 代码规范

### TypeScript
- 所有代码必须使用TypeScript
- 使用严格类型检查
- 避免使用`any`类型

### 代码风格
- 使用Prettier进行代码格式化
- 遵循ESLint规则
- 组件使用函数式组件和Hooks

### 提交规范
- 提交信息使用英文
- 遵循[约定式提交](https://www.conventionalcommits.org/)
#### 提交类型：
- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 重构代码
- `test:` 添加或修改测试
- `chore:` 构建过程或辅助工具的变动

### 组件规范
- 组件使用PascalCase命名
- 每个组件一个文件
- 组件使用函数声明
- 使用TypeScript接口定义Props

### 目录结构
```
src/
├── components/     # React组件
├── hooks/         # 自定义Hooks
├── utils/         # 工具函数
├── types/         # TypeScript类型定义
├── assets/        # 静态资源
└── App.tsx        # 主应用组件
```

## 测试

### 单元测试
- 为新功能添加测试
- 确保核心功能有测试覆盖

### 手动测试
- 测试所有文件上传功能
- 验证3D渲染性能
- 检查移动端响应式设计

## Pull Request流程

1. **更新代码**: 确保你的分支是最新的
2. **运行测试**: 确保所有测试通过
3. **代码检查**: 运行`npm run lint`和`npm run format`
4. **构建验证**: 运行`npm run build`确保构建成功
5. **描述清楚**: 在PR中清晰描述变更内容
6. **链接Issue**: 如果相关，链接到Issue

## 代码审查

所有Pull Request都需要经过代码审查。审查标准包括：
- 代码质量和可读性
- 功能完整性和正确性
- 测试覆盖率
- 性能影响
- 向后兼容性

## 发布流程

项目维护者负责：
1. 版本管理
2. 发布公告
3. 更新文档
4. 维护更新日志

## 获取帮助

- 查看[README.md](README.md)获取基本使用信息
- 查看[文档](docs/)获取详细指南
- 在GitHub Issues中提问
- 联系项目维护者

## 致谢

感谢所有贡献者的时间和努力！你们的贡献让这个项目变得更好。