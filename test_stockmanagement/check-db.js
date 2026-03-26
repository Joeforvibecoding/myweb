const sqlite3 = require('node-sqlite3-wasm');
const path = require('path');

async function checkDatabases() {
  console.log('========== 检查数据库 ==========\n');

  // 检查项目目录下的数据库
  const projectDbPath = path.join(__dirname, 'test_goodscontrol.db');
  console.log('1. 项目目录数据库:', projectDbPath);

  try {
    const db1 = new sqlite3.Database(projectDbPath);
    const row1 = await db1.get('SELECT * FROM goods WHERE goods_code = ?', ['8010423897193']);
    console.log('   查询结果:', row1 ? '找到记录' : '未找到记录');
    if (row1) console.log('   数据:', row1);

    const count1 = await db1.get('SELECT COUNT(*) as count FROM goods');
    console.log('   总记录数:', count1.count);
    db1.close();
  } catch (err) {
    console.log('   错误:', err.message);
  }

  console.log('\n--------------------------------\n');

  // 检查 C:\Windows\SQLite\DB 下的数据库
  const windowsDbPath = 'C:\\Windows\\SQLite\\DB\\test_goodscontrol.db';
  console.log('2. Windows目录数据库:', windowsDbPath);

  try {
    const db2 = new sqlite3.Database(windowsDbPath);
    const row2 = await db2.get('SELECT * FROM goods WHERE goods_code = ?', ['8010423897193']);
    console.log('   查询结果:', row2 ? '找到记录' : '未找到记录');
    if (row2) console.log('   数据:', row2);

    const count2 = await db2.get('SELECT COUNT(*) as count FROM goods');
    console.log('   总记录数:', count2.count);
    db2.close();
  } catch (err) {
    console.log('   错误:', err.message);
  }

  console.log('\n========== 检查完成 ==========');
}

checkDatabases();
