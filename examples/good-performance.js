// 这个文件展示了优化后的代码示例

// ✅ 优化 1: 使用 Set 代替嵌套循环
function findDuplicates(arr1, arr2) {
    const set2 = new Set(arr2);
    return arr1.filter(item => set2.has(item));
}

// ✅ 优化 2: 使用 DocumentFragment 批量操作 DOM
function updateList(items) {
    const list = document.getElementById('list');
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < items.length; i++) {
        const li = document.createElement('li');
        li.textContent = items[i];
        fragment.appendChild(li);
    }

    list.appendChild(fragment); // 只触发一次 DOM 操作
}

// ✅ 优化 3: 正确清理事件监听器
function setupListener() {
    const button = document.getElementById('button');
    const handleClick = () => {
        console.log('Clicked!');
    };

    button.addEventListener('click', handleClick);

    // 返回清理函数
    return () => {
        button.removeEventListener('click', handleClick);
    };
}

// ✅ 优化 4: 保存定时器 ID 并提供清理方法
function startPolling() {
    const intervalId = setInterval(() => {
        fetch('/api/data').then(res => res.json());
    }, 1000);

    // 返回清理函数
    return () => {
        clearInterval(intervalId);
    };
}

// ✅ 优化 5: 使用防抖优化滚动事件
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const handleScroll = debounce(() => {
    console.log('Scrolling...', window.scrollY);
    updateUI();
}, 100);

window.addEventListener('scroll', handleScroll);

// ✅ 优化 6: 使用单次 reduce 代替多次遍历
function processData(data) {
    return data.reduce((acc, item) => {
        if (item.active && item.value > 0) {
            acc.push(item.value * 2);
        }
        return acc;
    }, []);
}

// ✅ 优化 7: 按需导入
import { debounce, throttle } from 'lodash';
import dayjs from 'dayjs'; // 使用更轻量的 dayjs 代替 moment

// ✅ 优化 8: 使用 Promise.all 并行处理
async function fetchMultipleItems(ids) {
    const promises = ids.map(id =>
        fetch(`/api/items/${id}`).then(res => res.json())
    );
    return Promise.all(promises);
}

// ✅ 优化 9: 使用 textContent 或模板
function renderText(content) {
    document.getElementById('container').textContent = content;
}

// 或使用模板引擎
function renderTemplate(data) {
    const template = `
        <div class="item">
            <h2>${escapeHtml(data.title)}</h2>
            <p>${escapeHtml(data.description)}</p>
        </div>
    `;
    document.getElementById('container').innerHTML = template;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ✅ 优化 10: 简化正则表达式
const simpleRegex = /a+b/;
function testRegex(input) {
    return simpleRegex.test(input);
}

// ✅ React 组件优化示例
import React, { useMemo, useCallback } from 'react';

function OptimizedComponent({ items, onItemClick }) {
    // 使用 useMemo 缓存计算结果
    const filteredItems = useMemo(() => {
        return items.filter(item => item.active);
    }, [items]);

    // 使用 useCallback 缓存回调函数
    const handleClick = useCallback((id) => {
        onItemClick(id);
    }, [onItemClick]);

    return (
        <ul>
            {filteredItems.map(item => (
                <li key={item.id} onClick={() => handleClick(item.id)}>
                    {item.name}
                </li>
            ))}
        </ul>
    );
}

// ✅ Vue 组件优化示例
export default {
    setup() {
        const items = ref([]);

        // 使用 computed 缓存计算属性
        const filteredItems = computed(() => {
            return items.value.filter(item => item.active);
        });

        // 在 onMounted 中添加监听器
        onMounted(() => {
            window.addEventListener('resize', handleResize);
        });

        // 在 onUnmounted 中清理
        onUnmounted(() => {
            window.removeEventListener('resize', handleResize);
        });

        return {
            filteredItems
        };
    }
};
