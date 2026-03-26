const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = path.join(__dirname, 'test_goodscontrol.db');
const sqlite3Path = 'C:\\Windows\\SQLite\\sqlite3.exe';

app.get('/api/query', (req, res) => {
  const { goods_code } = req.query;
  
  console.log('========================================');
  console.log('收到查询请求，goods_code:', goods_code);
  
  if (!goods_code) {
    return res.status(400).json({ error: '请输入goods_code' });
  }

  // 使用完整路径的SQLite命令行工具查询
  const sql = `SELECT goods_code, cost_price FROM goods WHERE goods_code = '${goods_code}'`;
  const cmd = `"${sqlite3Path}" "${dbPath}" "${sql}"`;
  
  console.log('执行命令:', cmd);
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('查询错误:', error.message);
      return res.status(500).json({ error: '数据库查询失败', details: error.message });
    }
    
    if (stderr) {
      console.error('SQLite错误:', stderr);
      return res.status(500).json({ error: '数据库查询失败', details: stderr });
    }
    
    console.log('查询结果原始输出:', stdout);
    
    // 解析输出结果 (格式: goods_code|cost_price)
    const result = stdout.trim();
    if (result) {
      const parts = result.split('|');
      if (parts.length >= 2) {
        res.json({
          found: true,
          data: {
            goods_code: parts[0],
            cost_price: parseFloat(parts[1])
          }
        });
      } else {
        res.json({ found: false, message: '未找到该goods_code对应的记录' });
      }
    } else {
      res.json({
        found: false,
        message: '未找到该goods_code对应的记录'
      });
    }
  });
});

// 测试数据库连接
console.log('正在测试数据库连接...');
const testCmd = `"${sqlite3Path}" "${dbPath}" "SELECT COUNT(*) FROM goods"`;
exec(testCmd, (error, stdout, stderr) => {
  if (error) {
    console.error('数据库连接测试失败:', error.message);
  } else {
    console.log('数据库连接成功，商品数量:', stdout.trim());
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`数据库路径: ${dbPath}`);
});
