// 测试文件：包含多个性能问题

// 问题 1: 嵌套循环
function nestedLoop(arr1, arr2) {
    for (let i = 0; i < arr1.length; i++) {
        for (let j = 0; j < arr2.length; j++) {
            console.log(arr1[i], arr2[j]);
        }
    }
}

// 问题 2: 循环中的 DOM 操作
function domInLoop(items) {
    for (let i = 0; i < items.length; i++) {
        document.getElementById('container').appendChild(
            document.createElement('div')
        );
    }
}

// 问题 3: 未清除的定时器
function setupTimer() {
    setInterval(() => {
        console.log('tick');
    }, 1000);
    // 没有清除定时器
}

// 问题 4: 未移除的事件监听器
function addListener() {
    window.addEventListener('scroll', () => {
        console.log('scrolling');
    });
    // 没有移除监听器
}

// 问题 5: 链式数组操作
function processData(data) {
    return data
        .map(item => item.value)
        .filter(value => value > 0)
        .map(value => value * 2)
        .filter(value => value < 100);
}
