// 测试新增的高级性能检测功能
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as _ from 'lodash';  // 完整导入大型库
import moment from 'moment';   // 另一个大型库
import { Button } from 'antd';
import { Button as Btn } from 'antd';  // 重复导入

// 1. React Hooks 依赖问题
function UserProfile({ userId }) {
    const [user, setUser] = useState(null);

    // 缺少依赖数组
    useEffect(() => {
        fetchUser(userId);
    });

    // 空依赖数组但使用了 props
    useEffect(() => {
        console.log(userId);
    }, []);

    // useCallback 缺少依赖
    const handleClick = useCallback(() => {
        console.log(userId);
    });

    // useMemo 缺少依赖
    const expensiveValue = useMemo(() => {
        return computeExpensive(userId);
    });

    return <div>{user?.name}</div>;
}

// 2. 网络请求性能问题
function ProductList({ productIds }) {
    const [products, setProducts] = useState([]);

    // 在循环中发起网络请求
    useEffect(() => {
        productIds.forEach(id => {
            fetch(`/api/products/${id}`)
                .then(res => res.json())
                .then(data => setProducts(prev => [...prev, data]));
        });
    }, [productIds]);

    // 在组件函数体中直接发起请求（不在 useEffect 中）
    const data = fetch('/api/config').then(res => res.json());

    return <div>{products.length}</div>;
}

// 3. 异步操作优化
async function loadUserData(userId) {
    // 串行 await 调用，应该使用 Promise.all
    const profile = await fetch(`/api/users/${userId}/profile`);
    const posts = await fetch(`/api/users/${userId}/posts`);
    const followers = await fetch(`/api/users/${userId}/followers`);
    
    return { profile, posts, followers };
}

// 4. Promise rejection 未处理
function fetchData() {
    fetch('/api/data')
        .then(res => res.json())
        .then(data => console.log(data));
        // 缺少 .catch()
}

// 5. 未设置超时的请求
async function getData() {
    const response = await fetch('/api/data');
    return response.json();
}

// 6. 在循环中调用 Hooks（错误）
function BadComponent({ items }) {
    const results = items.map(item => {
        const [state, setState] = useState(null);  // 错误：在循环中调用 Hook
        return state;
    });
    
    return <div>{results}</div>;
}

// 7. 循环中创建 Promise
async function processItems(items) {
    for (const item of items) {
        await new Promise(resolve => {
            setTimeout(() => processItem(item), 100);
        });
    }
}

// Helper functions (这些不会被检测为问题)
function fetchUser(id) {}
function computeExpensive(data) { return data; }
function processItem(item) {}
