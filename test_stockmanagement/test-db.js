const sqlite3 = require('node-sqlite3-wasm');
const path = require('path');

const dbPath = path.join(__dirname, 'test_goodscontrol.db');

async function testDb() {
  try {
    console.log('正在连接数据库:', dbPath);
    const db = new sqlite3.Database(dbPath);
    console.log('数据库连接成功');

    // 检查表结构
    console.log('\n检查表结构...');
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('数据库中的表:', tables);

    // 检查goods表结构
    console.log('\n检查goods表结构...');
    const schema = await db.all("PRAGMA table_info(goods)");
    console.log('goods表结构:', schema);

    // 查询所有数据
    console.log('\n查询goods表所有数据...');
    const allData = await db.all('SELECT * FROM goods LIMIT 10');
    console.log('前10条数据:', allData);

    // 测试特定商品编码查询
    console.log('\n测试查询商品编码 8010423897192...');
    const row = await db.get('SELECT goods_code, cost_price FROM goods WHERE goods_code = ?', ['8010423897192']);
    console.log('查询结果:', row);

    // 查询总数
    console.log('\n查询总记录数...');
    const count = await db.get('SELECT COUNT(*) as count FROM goods');
    console.log('总记录数:', count);

    db.close();
    console.log('\n数据库连接已关闭');
  } catch (err) {
    console.error('错误:', err.message);
    console.error(err.stack);
  }
}

testDb();
