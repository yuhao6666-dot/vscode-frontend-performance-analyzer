// 这个文件包含多个性能问题示例，用于测试插件功能

// ❌ 问题 1: 嵌套循环
function findDuplicates(arr1, arr2) {
    const duplicates = [];
    for (let i = 0; i < arr1.length; i++) {
        for (let j = 0; j < arr2.length; j++) {
            if (arr1[i] === arr2[j]) {
                duplicates.push(arr1[i]);
            }
        }
    }
    return duplicates;
}

// ❌ 问题 2: 循环中的 DOM 操作
function updateList(items) {
    const list = document.getElementById('list');
    for (let i = 0; i < items.length; i++) {
        const li = document.createElement('li');
        li.textContent = items[i];
        list.appendChild(li); // 每次都触发 DOM 操作
    }
}

// ❌ 问题 3: 未移除的事件监听器
function setupListener() {
    const button = document.getElementById('button');
    button.addEventListener('click', () => {
        console.log('Clicked!');
    });
    // 缺少清理逻辑
}

// ❌ 问题 4: 未清除的定时器
function startPolling() {
    setInterval(() => {
        fetch('/api/data').then(res => res.json());
    }, 1000);
    // 没有保存 interval ID，无法清除
}

// ❌ 问题 5: 未使用防抖的滚动事件
window.addEventListener('scroll', () => {
    // 滚动事件频繁触发，但没有防抖处理
    console.log('Scrolling...', window.scrollY);
    updateUI();
});

// ❌ 问题 6: 多次链式数组操作
function processData(data) {
    return data
        .filter(item => item.active)
        .map(item => item.value)
        .filter(value => value > 0)
        .map(value => value * 2);
}

// ❌ 问题 7: 完整导入大型库
import * as lodash from 'lodash';
import * as moment from 'moment';

// ❌ 问题 8: 循环中的异步操作
async function fetchMultipleItems(ids) {
    const results = [];
    for (const id of ids) {
        const data = await fetch(`/api/items/${id}`);
        results.push(await data.json());
    }
    return results;
}

// ❌ 问题 9: 直接使用 innerHTML
function renderHTML(content) {
    document.getElementById('container').innerHTML = content;
}

// ❌ 问题 10: 复杂的正则表达式（可能导致 ReDoS）
const complexRegex = /(a+)+b/;
function testRegex(input) {
    return complexRegex.test(input);
}
