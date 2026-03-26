# SQLite查询系统Bug测试经验总结

## 项目概述
搭建一个静态网页，通过API连接SQLite数据库，实现根据goods_code查询goods表中的cost_price功能。

---

## 遇到的问题及解决方案

### 1. 数据库模块依赖问题

**问题现象：**
- 使用`sqlite3`或`better-sqlite3`模块时，运行`node server.js`报错
- 错误信息：`Error: Cannot find module 'sqlite3'`

**原因分析：**
- npm依赖包未安装
- Windows PowerShell执行策略限制，无法运行`npm install`

**解决方案：**
- 改用系统已安装的SQLite命令行工具，通过Node.js的`child_process.exec`调用
- 使用纯JavaScript方案，无需额外安装依赖包

**关键代码：**
```javascript
const { exec } = require('child_process');
const sqlite3Path = 'C:\\Windows\\SQLite\\sqlite3.exe';
const dbPath = 'C:\\Windows\\SQLite\\DB\\test_goodscontrol.db';

const cmd = `"${sqlite3Path}" "${dbPath}" "SELECT * FROM goods WHERE goods_code = '${goods_code}'"`;
exec(cmd, (error, stdout, stderr) => {
  // 处理查询结果
});
```

---

### 2. SQLite命令行工具未配置环境变量

**问题现象：**
- 服务器启动后，查询返回"未找到记录"
- 终端日志显示：`'sqlite3' 不是内部或外部命令`

**原因分析：**
- 系统已安装DB Browser for SQLite（图形界面）
- 但SQLite命令行工具（sqlite3.exe）未添加到系统PATH环境变量

**解决方案：**
- 确认sqlite3.exe位置：`C:\Windows\SQLite\sqlite3.exe`
- 在代码中使用完整路径，而非依赖环境变量

**关键代码：**
```javascript
// 使用完整路径，不依赖环境变量
const sqlite3Path = 'C:\\Windows\\SQLite\\sqlite3.exe';
const cmd = `"${sqlite3Path}" "${dbPath}" "${sql}"`;
```

---

### 3. 端口占用问题

**问题现象：**
- 多次重启服务器时，报错`Error: listen EADDRINUSE: address already in use :::3001`

**原因分析：**
- 之前的服务器进程未完全退出
- 端口被占用无法重新绑定

**解决方案：**
- 更换端口号（3001 → 3002 → 3003 → 3005）
- 或在启动新服务器前，手动结束占用端口的进程

**经验：**
- 开发阶段使用高位端口号（3000+），避免与系统服务冲突
- 记录当前使用的端口号，方便访问

---

### 4. 数据库连接验证

**问题现象：**
- 不确定数据库是否连接成功
- 不知道数据库中有多少条记录

**解决方案：**
- 服务器启动时添加连接测试
- 查询商品总数，确认数据库可正常访问

**关键代码：**
```javascript
// 启动时测试数据库连接
const testCmd = `"${sqlite3Path}" "${dbPath}" "SELECT COUNT(*) FROM goods"`;
exec(testCmd, (error, stdout, stderr) => {
  if (error) {
    console.error('数据库连接测试失败:', error.message);
  } else {
    console.log('数据库连接成功，商品数量:', stdout.trim());
  }
});
```

---

## 调试技巧

### 1. 添加详细日志
在关键步骤添加`console.log`，记录：
- 收到的请求参数
- 执行的SQL语句
- 命令行执行的完整命令
- 原始输出结果
- 解析后的数据

### 2. 逐步验证
1. 验证SQLite命令行工具可用：`sqlite3 --version`
2. 验证数据库文件存在且可访问
3. 验证SQL语句在命令行中能正常执行
4. 验证Node.js能正确调用命令行
5. 验证前端能正确显示结果

### 3. 使用浏览器开发者工具
- Network标签查看API请求和响应
- Console标签查看前端错误

---

## 最终成功配置

### 服务器配置
```javascript
const PORT = 3005;
const dbPath = 'C:\\Windows\\SQLite\\DB\\test_goodscontrol.db';
const sqlite3Path = 'C:\\Windows\\SQLite\\sqlite3.exe';
```

### 访问地址
http://localhost:3005

### 支持的查询
- 商品编码：`8010423897192`、`8010423897194`、`8010423897197`
- 返回字段：goods_code、cost_price

---

### 5. Windows系统目录权限问题（disk I/O error）

**问题现象：**
- 查询商品编码时返回错误：`{"error":"数据库查询失败","details":"disk I/O error"}`
- 测试脚本直接连接数据库正常，但通过Express API查询失败

**原因分析：**
- 数据库文件原位于 `C:\Windows\SQLite\DB\test_goodscontrol.db`
- Node.js进程没有权限访问Windows系统目录下的文件
- `node-sqlite3-wasm`以读写模式打开数据库时，Windows会阻止对系统目录的写入操作

**解决方案：**
- 将数据库文件复制到项目目录下：`./test_goodscontrol.db`
- 修改代码使用相对路径：`path.join(__dirname, 'test_goodscontrol.db')`
- Node.js进程对项目目录有完全读写权限

**关键代码：**
```javascript
const path = require('path');
// 使用项目目录下的数据库，避免Windows权限问题
const dbPath = path.join(__dirname, 'test_goodscontrol.db');
```

**经验：**
- 避免将应用数据文件放在Windows系统目录（C:\Windows、C:\Program Files等）
- 用户数据应存放在用户目录或应用目录下
- 如果遇到`disk I/O error`，首先检查文件路径权限

---

### 6. 端口占用与进程管理

**问题现象：**
- 多次切换端口（3001 → 3002 → 3006 → 3007）
- 报错`Error: listen EADDRINUSE: address already in use :::3007`
- 之前的Node进程未完全退出，端口仍处于TIME_WAIT状态

**解决方案：**
- 使用`netstat -ano | findstr :端口号`查找占用进程
- 使用`taskkill /F /PID 进程ID`强制结束进程
- 或等待端口释放（TIME_WAIT状态通常持续几分钟）

**经验：**
- 开发阶段频繁重启服务器时，注意清理残留进程
- 可以使用`Get-Process -Name "node"`查看所有Node进程

---

## 经验总结

1. **优先使用系统已有工具**：如果系统已安装SQLite命令行工具，优先考虑调用命令行，而非引入新的依赖包

2. **使用完整路径**：在Windows环境下，使用完整文件路径可以避免环境变量配置问题

3. **添加启动检测**：服务器启动时验证关键资源（数据库、配置文件）是否可用

4. **详细的错误日志**：记录完整的错误信息，包括error、stdout、stderr

5. **逐步排查**：从最简单的命令开始测试，逐步增加复杂度，定位问题所在

6. **注意Windows权限问题**：避免将数据文件放在系统目录，使用用户有权限访问的目录

7. **及时释放资源**：数据库连接使用完后立即关闭，避免资源泄漏

8. **端口管理**：频繁重启时注意清理残留进程，避免端口占用

---

## 技术栈

- **后端**：Node.js + Express
- **数据库**：SQLite3 (node-sqlite3-wasm)
- **前端**：HTML + CSS + JavaScript
- **通信**：RESTful API (GET /api/query, POST /api/import-csv)
- **文件上传**：multer
