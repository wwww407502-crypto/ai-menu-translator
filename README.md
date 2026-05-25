# 自动菜单翻译

> 📸 拍照即可翻译菜单 —— 基于阿里云千问视觉大模型的微信小程序

## 功能介绍

出国旅游或在国内遇到外语菜单时，只需拍一张照片，即可自动：

- 🔍 **OCR 识别**：精准提取菜单上的菜品名称和价格
- 🌐 **多语言翻译**：支持 20+ 种语言互译（中文、英文、日文、韩文、法文、德文等）
- 💰 **货币转换**：自动识别原始货币并换算为人民币（或目标货币）
- 📊 **结构化展示**：智能识别套餐、加购项、优惠规则，清晰呈现
- 🛒 **点单助手**：支持加入购物车、数量调整
- 🧾 **收据生成**：一键生成点单汇总小票

## 项目架构

```
自动菜单翻译
├── miniprogram/          # 微信小程序前端（原生框架）
│   ├── pages/
│   │   ├── index/        # 首页：拍照 / 相册选图
│   │   ├── menu/         # 菜单展示页：结构化菜单 + 购物车
│   │   └── receipt/      # 收据页：点单汇总
│   └── utils/            # 工具模块（API 调用、国际化、状态管理等）
├── backend/              # Node.js 后端服务（Express）
│   ├── services/         # 核心服务（AI 调用、菜单解析、汇率查询）
│   ├── routes/           # API 路由
│   ├── middleware/        # 中间件（限流、CORS、并发控制、上传）
│   └── lib/              # 工具库（价格解析、货币、语言检测等）
└── project.config.json   # 微信小程序项目配置
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 小程序前端 | 微信原生框架（WXML / WXSS / JS） |
| 后端框架 | Node.js + Express |
| AI 模型 | 阿里云百炼 DashScope（千问 Qwen3-VL 视觉模型） |
| 进程管理 | PM2（Cluster 模式） |
| 汇率数据 | 实时汇率 API + 内置降级汇率 |

## 快速开始

### 前提条件

- Node.js 18+
- 微信开发者工具
- 阿里云百炼 API Key（[免费获取](https://bailian.console.aliyun.com/)）

### 1. 克隆项目

```bash
git clone https://github.com/wwww407502-crypto/ai-menu-translator.git
cd ai-menu-translator
```

### 2. 配置后端

```bash
cd backend
npm install

# 创建环境变量文件
cp .env.example .env
```

编辑 `backend/.env`，填入你的阿里云百炼 API Key：

```env
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx
VISION_MODEL=qwen3-vl-flash
```

### 3. 启动后端

```bash
# 开发模式（热重载）
npm run dev

# 生产模式（PM2 集群）
npm install -g pm2
pm2 start ecosystem.config.js
```

服务默认运行在 `http://localhost:3000`。

### 4. 打开小程序

1. 打开微信开发者工具
2. 导入项目，选择项目根目录
3. `project.config.json` 已配置 `miniprogramRoot` 为 `miniprogram/`
4. 开发者工具中"不校验合法域名"选项默认开启，本地调试无需额外配置

### 5. 开始使用

1. 点击「拍照」或「从相册选择」上传菜单图片
2. 等待 10-30 秒（AI 正在解析）
3. 查看结构化菜单，选择菜品加入购物车
4. 查看收据汇总

## 项目配置说明

### 后端环境变量（`.env`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DASHSCOPE_API_KEY` | 阿里云百炼 API Key（**必填**） | - |
| `VISION_MODEL` | 视觉模型名称 | `qwen3-vl-flash` |
| `PORT` | 服务端口 | `3000` |
| `PARSE_TIMEOUT_MS` | 解析超时（毫秒） | `90000` |
| `MAX_CONCURRENT_PARSES` | 最大并发解析数 | `4` |
| `API_KEYS` | API 鉴权 Key（逗号分隔，留空则不鉴权） | - |

### 前端配置（`miniprogram/utils/config.js`）

开发环境自动连接 `http://127.0.0.1:3000`，正式版自动切换为生产域名。

修改 `PROD_API_BASE_URL` 为你自己的 HTTPS 域名。

## 上线部署

参见 [上线优化清单](#) —— 需要准备：

1. 已备案域名 + SSL 证书
2. 云服务器（2核4G 起步）
3. Nginx 反向代理 + HTTPS
4. 微信公众平台配置服务器域名白名单
5. 提交小程序审核

## 解析策略

系统采用三级降级策略确保稳定性：

| 策略 | 说明 |
|------|------|
| **Direct** | 完整结构化解析（套餐/阶梯价/优惠规则），首次尝试 |
| **Simplified** | 简化模式（仅名称+价格），Direct 失败时自动降级 |
| **Degraded** | 纯文本正则提取，前两级都失败时兜底 |

## 支持的货币

自动识别并支持 50+ 种货币的实时汇率转换，包括美元、欧元、日元、韩元、泰铢、越南盾等。

## 开原协议

MIT License
