// 当前表格数据存储
let currentTableData = [];

// 渲染表格数据
function renderTable(data, isQueryResult = false) {
    const tableBody = document.getElementById('tableBody');
    const tableInfo = document.getElementById('tableInfo');

    // 保存当前数据用于导出
    currentTableData = data;

    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="no-data">暂无数据</td></tr>';
        tableInfo.textContent = '';
        return;
    }

    data.forEach((item, index) => {
        const row = document.createElement('tr');
        if (isQueryResult) {
            row.classList.add('highlight-row');
        }
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.goods_code}</td>
            <td>¥${item.cost_price}</td>
        `;
        tableBody.appendChild(row);
    });

    if (isQueryResult) {
        tableInfo.textContent = `查询结果：找到 1 条记录`;
    } else {
        tableInfo.textContent = `显示前 ${data.length} 条记录`;
    }
}

// 导出CSV功能
function exportToCsv() {
    if (currentTableData.length === 0) {
        alert('没有数据可导出');
        return;
    }

    // CSV表头
    let csvContent = '\uFEFF'; // BOM for UTF-8
    csvContent += '序号,商品编码,成本价格\n';

    // CSV数据行
    currentTableData.forEach((item, index) => {
        const row = [
            index + 1,
            item.goods_code,
            item.cost_price
        ];
        csvContent += row.join(',') + '\n';
    });

    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // 设置文件名（包含日期时间）
    const now = new Date();
    const dateStr = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');

    link.setAttribute('href', url);
    link.setAttribute('download', `商品数据_${dateStr}.csv`);

    // 触发下载
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 加载默认数据（前5条）
async function loadDefaultData() {
    try {
        const response = await fetch('/api/goods-list?limit=5');
        const data = await response.json();

        if (data.success) {
            renderTable(data.data, false);
        }
    } catch (error) {
        console.error('加载默认数据失败:', error);
    }
}

async function queryGoods() {
    const goodsCode = document.getElementById('goodsCode').value.trim();
    const resultDiv = document.getElementById('result');

    if (!goodsCode) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '请输入商品编码';
        // 如果没有输入，显示默认数据
        loadDefaultData();
        return;
    }

    resultDiv.className = 'result loading';
    resultDiv.innerHTML = '查询中...';

    try {
        const response = await fetch(`/api/query?goods_code=${encodeURIComponent(goodsCode)}`);
        const data = await response.json();

        if (data.found) {
            resultDiv.className = 'result success';
            resultDiv.innerHTML = `
                <div class="result-item">
                    <span class="result-label">商品编码：</span>${data.data.goods_code}
                </div>
                <div class="result-item">
                    <span class="result-label">成本价格：</span>¥${data.data.cost_price}
                </div>
            `;
            // 在表格中显示查询结果
            renderTable([data.data], true);
        } else {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = data.message || '未找到该商品编码对应的记录';
            // 查询不到时清空表格
            document.getElementById('tableBody').innerHTML = '<tr><td colspan="3" class="no-data">未找到匹配记录</td></tr>';
            document.getElementById('tableInfo').textContent = '查询结果：0 条记录';
        }
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '查询失败：' + error.message;
    }
}

document.getElementById('goodsCode').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        queryGoods();
    }
});

document.getElementById('csvFile').addEventListener('change', function(e) {
    const fileName = e.target.files[0] ? e.target.files[0].name : '未选择文件';
    document.getElementById('fileName').textContent = fileName;
});

// 页面加载时自动加载前5条数据
document.addEventListener('DOMContentLoaded', function() {
    loadDefaultData();
});

// 准备修改 - 查询当前商品信息
async function prepareUpdate() {
    const goodsCode = document.getElementById('updateGoodsCode').value.trim();
    const resultDiv = document.getElementById('updateResult');
    const updateForm = document.getElementById('updateForm');

    if (!goodsCode) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '请输入商品编码';
        updateForm.style.display = 'none';
        return;
    }

    resultDiv.className = 'result loading';
    resultDiv.innerHTML = '查询中...';

    try {
        const response = await fetch(`/api/query?goods_code=${encodeURIComponent(goodsCode)}`);
        const data = await response.json();

        if (data.found) {
            resultDiv.className = 'result';
            resultDiv.innerHTML = '';
            // 显示修改表单
            document.getElementById('updateGoodsCodeDisplay').textContent = data.data.goods_code;
            document.getElementById('currentCostPrice').textContent = data.data.cost_price;
            document.getElementById('newCostPrice').value = '';
            updateForm.style.display = 'block';
        } else {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = data.message || '未找到该商品编码对应的记录';
            updateForm.style.display = 'none';
        }
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '查询失败：' + error.message;
        updateForm.style.display = 'none';
    }
}

// 提交修改
async function submitUpdate() {
    const goodsCode = document.getElementById('updateGoodsCode').value.trim();
    const newCostPrice = document.getElementById('newCostPrice').value.trim();
    const resultDiv = document.getElementById('updateResult');

    if (!newCostPrice || isNaN(parseFloat(newCostPrice))) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '请输入有效的成本价';
        return;
    }

    resultDiv.className = 'result loading';
    resultDiv.innerHTML = '修改中...';

    try {
        const response = await fetch('/api/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goods_code: goodsCode,
                cost_price: parseFloat(newCostPrice)
            })
        });

        const data = await response.json();

        if (data.success) {
            resultDiv.className = 'result success';
            resultDiv.innerHTML = `
                <div class="result-item"><span class="result-label">${data.message}</span></div>
                <div class="result-item">
                    <span class="result-label">商品编码：</span>${data.data.goods_code}
                </div>
                <div class="result-item">
                    <span class="result-label">原成本价：</span>¥${data.data.old_cost_price}
                </div>
                <div class="result-item">
                    <span class="result-label">新成本价：</span>¥${data.data.new_cost_price}
                </div>
            `;
            // 隐藏修改表单
            document.getElementById('updateForm').style.display = 'none';
            document.getElementById('updateGoodsCode').value = '';
        } else {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = data.error || '修改失败';
        }
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '修改失败：' + error.message;
    }
}

// 回车键触发查询修改
document.getElementById('updateGoodsCode').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        prepareUpdate();
    }
});

// 回车键触发提交修改
document.getElementById('newCostPrice').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        submitUpdate();
    }
});

// 准备删除 - 查询并二次确认
async function prepareDelete() {
    const goodsCode = document.getElementById('deleteGoodsCode').value.trim();
    const resultDiv = document.getElementById('deleteResult');

    if (!goodsCode) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '请输入商品编码';
        return;
    }

    resultDiv.className = 'result loading';
    resultDiv.innerHTML = '查询中...';

    try {
        const response = await fetch(`/api/query?goods_code=${encodeURIComponent(goodsCode)}`);
        const data = await response.json();

        if (data.found) {
            // 显示商品信息并进行二次确认
            const confirmMessage = `确定要删除以下商品吗？\n\n商品编码：${data.data.goods_code}\n成本价格：¥${data.data.cost_price}\n\n此操作不可恢复！`;

            if (confirm(confirmMessage)) {
                // 用户确认，执行删除
                await executeDelete(goodsCode);
            } else {
                // 用户取消
                resultDiv.className = 'result';
                resultDiv.innerHTML = '';
            }
        } else {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = data.message || '未找到该商品编码对应的记录';
        }
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '查询失败：' + error.message;
    }
}

// 执行删除
async function executeDelete(goodsCode) {
    const resultDiv = document.getElementById('deleteResult');

    resultDiv.className = 'result loading';
    resultDiv.innerHTML = '删除中...';

    try {
        const response = await fetch('/api/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goods_code: goodsCode
            })
        });

        const data = await response.json();

        if (data.success) {
            resultDiv.className = 'result success';
            resultDiv.innerHTML = `
                <div class="result-item"><span class="result-label">${data.message}</span></div>
                <div class="result-item">
                    <span class="result-label">已删除商品编码：</span>${data.data.goods_code}
                </div>
                <div class="result-item">
                    <span class="result-label">成本价格：</span>¥${data.data.cost_price}
                </div>
            `;
            // 清空输入框
            document.getElementById('deleteGoodsCode').value = '';
        } else {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = data.error || '删除失败';
        }
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '删除失败：' + error.message;
    }
}

// 回车键触发删除
document.getElementById('deleteGoodsCode').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        prepareDelete();
    }
});

async function importCsv() {
    const fileInput = document.getElementById('csvFile');
    const resultDiv = document.getElementById('importResult');
    
    if (!fileInput.files[0]) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '请先选择CSV文件';
        return;
    }
    
    const formData = new FormData();
    formData.append('csvFile', fileInput.files[0]);
    
    resultDiv.className = 'result loading';
    resultDiv.innerHTML = '正在导入...';
    
    try {
        const response = await fetch('/api/import-csv', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultDiv.className = 'result success';
            let html = `<div class="result-item"><span class="result-label">${data.message}</span></div>`;
            if (data.failed > 0) {
                html += `<div class="result-item"><span class="result-label">失败:</span>${data.failed} 条</div>`;
                if (data.errors && data.errors.length > 0) {
                    html += '<div class="error-list"><p>错误详情：</p><ul>';
                    data.errors.forEach(err => {
                        html += `<li>${err}</li>`;
                    });
                    html += '</ul></div>';
                }
            }
            resultDiv.innerHTML = html;
            fileInput.value = '';
            document.getElementById('fileName').textContent = '未选择文件';
        } else {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = data.error || '导入失败';
        }
    } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '导入失败：' + error.message;
    }
}
