 // 这个文件包含多种性能问题，用于测试插件功能



 
// 1. 嵌套循环问题
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

// 2. 循环中的 DOM 操作
function updateList(items) {
    const list = document.getElementById('list');
    for (let i = 0; i < items.length; i++) {
        const li = document.createElement('li');
        li.textContent = items[i];
        list.appendChild(li); // 每次循环都触发重排
    }
}

// 3. 未清理的事件监听器（内存泄漏）
function setupEventListener() {
    const button = document.getElementById('btn');
    button.addEventListener('click', function() {
        console.log('Clicked!');
    });
    // 缺少移除监听器的逻辑
}

// 4. 未清理的定时器（内存泄漏）
function startPolling() {
    setInterval(() => {
        fetch('/api/status')
            .then(res => res.json())
            .then(data => console.log(data));
    }, 1000);
    // 缺少 clearInterval
}

// 5. 频繁的样式操作（导致重排重绘）
function animateElement() {
    const element = document.getElementById('box');
    for (let i = 0; i < 100; i++) {
        element.style.left = i + 'px'; // 每次都触发重排重绘
    }
}

// 6. 完整导入大型库（打包体积问题）
import * as _ from 'lodash'; // 应该使用按需导入

// 7. React 组件中的性能问题
function UserList({ users }) {
    return (
        <div>
            {users.map(user => (
                // 缺少 key 属性
                <div>
                    <span>{user.name}</span>
                    {/* 在 render 中创建新函数 */}
                    <button onClick={() => console.log(user.id)}>
                        View
                    </button>
                </div>
            ))}
        </div>
    );
}



// 8. 大量数据的同步处理（阻塞操作）
function processLargeData(data) {
    const result = [];
    for (let i = 0; i < 1000000; i++) {
        result.push(data[i] * 2);
    }
    return result;
}

// 9. 复杂的正则表达式
function validateEmail(email) {
    // 过于复杂的正则可能导致性能问题
    const regex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return regex.test(email);
}

// 10. 未使用防抖的频繁事件
window.addEventListener('scroll', function() {
    // 应该使用防抖/节流
    updateScrollPosition();
});

function updateScrollPosition() {
    console.log(window.scrollY);
}
