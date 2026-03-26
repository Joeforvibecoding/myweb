const express = require('express');
const sqlite3 = require('node-sqlite3-wasm');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3007;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = path.join(__dirname, 'test_goodscontrol.db');

const upload = multer({ dest: 'uploads/' });

// 获取前N条记录接口
app.get('/api/goods-list', async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  console.log('收到获取商品列表请求，limit:', limit);

  let db;
  try {
    db = new sqlite3.Database(dbPath);

    const rows = await db.all('SELECT goods_code, cost_price FROM goods LIMIT ?', [limit]);

    console.log('查询结果条数:', rows.length);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });

    db.close();
  } catch (err) {
    console.error('查询错误:', err.message);
    if (db) db.close();
    res.status(500).json({ error: '数据库查询失败', details: err.message });
  }
});

// 查询接口 - 每次查询时新建只读连接
app.get('/api/query', async (req, res) => {
  const { goods_code } = req.query;

  console.log('收到查询请求，goods_code:', goods_code);

  if (!goods_code) {
    return res.status(400).json({ error: '请输入goods_code' });
  }

  let db;
  try {
    // 打开数据库连接
    db = new sqlite3.Database(dbPath);

    const row = await db.get('SELECT goods_code, cost_price FROM goods WHERE goods_code = ?', [goods_code]);

    console.log('查询结果:', row);

    if (row) {
      res.json({
        found: true,
        data: row
      });
    } else {
      res.json({
        found: false,
        message: '未找到该goods_code对应的记录'
      });
    }

    db.close();
  } catch (err) {
    console.error('查询错误:', err.message);
    if (db) db.close();
    res.status(500).json({ error: '数据库查询失败', details: err.message });
  }
});

// 修改商品成本价接口
app.post('/api/update', async (req, res) => {
  const { goods_code, cost_price } = req.body;

  console.log('收到修改请求，goods_code:', goods_code, 'cost_price:', cost_price);

  if (!goods_code) {
    return res.status(400).json({ error: '请输入goods_code' });
  }

  if (cost_price === undefined || cost_price === null || isNaN(parseFloat(cost_price))) {
    return res.status(400).json({ error: '请输入有效的cost_price' });
  }

  // 检查数据库路径是否可写
  const dbDir = path.dirname(dbPath);
  try {
    fs.accessSync(dbDir, fs.constants.W_OK);
  } catch (err) {
    return res.status(500).json({
      error: '数据库目录没有写入权限',
      details: '请将数据库文件移动到用户目录下，或以管理员身份运行服务器'
    });
  }

  let db;
  try {
    db = new sqlite3.Database(dbPath);

    // 先检查商品是否存在
    const row = await db.get('SELECT goods_code, cost_price FROM goods WHERE goods_code = ?', [goods_code]);

    if (!row) {
      db.close();
      return res.status(404).json({ error: '未找到该goods_code对应的记录' });
    }

    // 更新成本价
    await db.run('UPDATE goods SET cost_price = ? WHERE goods_code = ?', [parseFloat(cost_price), goods_code]);

    db.close();

    res.json({
      success: true,
      message: '修改成功',
      data: {
        goods_code: goods_code,
        old_cost_price: row.cost_price,
        new_cost_price: parseFloat(cost_price)
      }
    });

  } catch (err) {
    console.error('修改错误:', err.message);
    if (db) db.close();
    res.status(500).json({ error: '数据库更新失败', details: err.message });
  }
});

// 删除商品接口
app.post('/api/delete', async (req, res) => {
  const { goods_code } = req.body;

  console.log('收到删除请求，goods_code:', goods_code);

  if (!goods_code) {
    return res.status(400).json({ error: '请输入goods_code' });
  }

  // 检查数据库路径是否可写
  const dbDir = path.dirname(dbPath);
  try {
    fs.accessSync(dbDir, fs.constants.W_OK);
  } catch (err) {
    return res.status(500).json({
      error: '数据库目录没有写入权限',
      details: '请将数据库文件移动到用户目录下，或以管理员身份运行服务器'
    });
  }

  let db;
  try {
    db = new sqlite3.Database(dbPath);

    // 先检查商品是否存在
    const row = await db.get('SELECT goods_code, cost_price FROM goods WHERE goods_code = ?', [goods_code]);

    if (!row) {
      db.close();
      return res.status(404).json({ error: '未找到该goods_code对应的记录' });
    }

    // 删除商品
    await db.run('DELETE FROM goods WHERE goods_code = ?', [goods_code]);

    db.close();

    res.json({
      success: true,
      message: '删除成功',
      data: {
        goods_code: goods_code,
        cost_price: row.cost_price
      }
    });

  } catch (err) {
    console.error('删除错误:', err.message);
    if (db) db.close();
    res.status(500).json({ error: '数据库删除失败', details: err.message });
  }
});

// CSV导入接口 - 需要写入权限，使用内存数据库或复制到可写位置
app.post('/api/import-csv', upload.single('csvFile'), async (req, res) => {
  console.log('收到CSV导入请求');
  
  if (!req.file) {
    return res.status(400).json({ error: '请上传CSV文件' });
  }

  // 检查数据库路径是否可写
  const dbDir = path.dirname(dbPath);
  try {
    fs.accessSync(dbDir, fs.constants.W_OK);
  } catch (err) {
    return res.status(500).json({ 
      error: '数据库目录没有写入权限', 
      details: '请将数据库文件移动到用户目录下，或以管理员身份运行服务器'
    });
  }

  let db;
  try {
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    fs.unlinkSync(req.file.path);

    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV文件格式错误：至少需要包含表头和一行数据' });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const goodsCodeIndex = headers.indexOf('goods_code');
    const costPriceIndex = headers.indexOf('cost_price');

    if (goodsCodeIndex === -1 || costPriceIndex === -1) {
      return res.status(400).json({ 
        error: 'CSV文件格式错误：必须包含 goods_code 和 cost_price 列',
        headers: headers
      });
    }

    const records = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(c => c.trim());
      
      if (columns.length < 2) {
        errors.push(`第 ${i + 1} 行: 数据格式不正确`);
        continue;
      }

      const goodsCode = columns[goodsCodeIndex];
      const costPrice = parseFloat(columns[costPriceIndex]);

      if (!goodsCode || isNaN(costPrice)) {
        errors.push(`第 ${i + 1} 行: goods_code 或 cost_price 无效`);
        continue;
      }

      records.push({ goods_code: goodsCode, cost_price: costPrice });
    }

    // 连接数据库进行写入
    db = new sqlite3.Database(dbPath);
    
    let insertedCount = 0;
    if (records.length > 0) {
      for (const record of records) {
        try {
          await db.run('INSERT INTO goods (goods_code, cost_price) VALUES (?, ?)', 
            [record.goods_code, record.cost_price]);
          insertedCount++;
        } catch (insertErr) {
          errors.push(`商品编码 ${record.goods_code}: ${insertErr.message}`);
        }
      }
    }

    db.close();

    res.json({
      success: true,
      message: `成功导入 ${insertedCount} 条记录`,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('CSV导入错误:', err.message);
    if (db) db.close();
    res.status(500).json({ error: 'CSV导入失败', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
