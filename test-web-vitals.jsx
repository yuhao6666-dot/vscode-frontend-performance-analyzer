// 测试 Web Vitals 性能问题检测

import React, { useEffect, useState } from 'react';

// ❌ 影响 INP: 高频事件未使用防抖
function ScrollHandler() {
    useEffect(() => {
        const handleScroll = () => {
            // 大量计算
            const data = [];
            for (let i = 0; i < 1000; i++) {
                data.push(i * 2);
            }
            console.log('Scroll position:', window.scrollY);
        };

        // 没有使用 debounce/throttle
        window.addEventListener('scroll', handleScroll);

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return <div>Scroll Handler</div>;
}

// ❌ 影响 INP: 强制同步布局
function LayoutThrashing() {
    const updateElements = () => {
        const elements = document.querySelectorAll('.item');
        elements.forEach((el) => {
            // 读取布局属性
            const height = el.offsetHeight;
            // 写入样式（导致 layout thrashing）
            el.style.height = height + 10 + 'px';
        });
    };

    return <button onClick={updateElements}>Update</button>;
}

// ❌ 影响 FCP: 顶层大量同步代码
const largeDataset = [];
for (let i = 0; i < 10000; i++) {
    largeDataset.push({
        id: i,
        name: `Item ${i}`,
        data: new Array(100).fill(i),
    });
}

// ❌ 影响 FCP: document.write
function OldSchoolRender() {
    const render = () => {
        document.write('<div>Hello</div>');
    };

    return <button onClick={render}>Render (Bad)</button>;
}

// ❌ 影响 FCP: alert 阻塞渲染
function BlockingAlert() {
    const showAlert = () => {
        alert('This blocks rendering!');
    };

    return <button onClick={showAlert}>Show Alert</button>;
}

// ❌ 影响 LCP: 延迟加载主要内容
function DelayedContent() {
    const [content, setContent] = useState('');

    useEffect(() => {
        // 主要内容在 setTimeout 中加载
        setTimeout(() => {
            fetch('/api/main-content')
                .then((res) => res.json())
                .then((data) => setContent(data));
        }, 2000);
    }, []);

    return <div>{content}</div>;
}

// ❌ 影响 LCP: 懒加载首屏组件
const HeroSection = React.lazy(() => import('./HeroSection'));

function HomePage() {
    return (
        <div>
            <React.Suspense fallback={<div>Loading...</div>}>
                <HeroSection />
            </React.Suspense>
        </div>
    );
}

// ❌ 影响 CLS: 图片未设置尺寸
function ImageGallery() {
    return (
        <div>
            <img src="/image1.jpg" alt="Image 1" />
            <img src="/image2.jpg" alt="Image 2" />
            <img src="/image3.jpg" alt="Image 3" />
        </div>
    );
}

// ❌ 影响 CLS: 动态插入内容
function DynamicContent() {
    const addContent = () => {
        const container = document.getElementById('container');
        const newDiv = document.createElement('div');
        newDiv.textContent = 'New content';
        container.appendChild(newDiv);
    };

    return (
        <div>
            <div id="container"></div>
            <button onClick={addContent}>Add Content</button>
        </div>
    );
}

// ❌ 影响 CLS: Web Font 加载
function FontLoader() {
    useEffect(() => {
        WebFont.load({
            google: {
                families: ['Roboto:400,700'],
            },
        });
    }, []);

    return <div>Font Loader</div>;
}

// ❌ 影响 TTI: 长任务
function HeavyComputation() {
    const compute = () => {
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
            result += Math.sqrt(i);
        }
        for (let i = 0; i < 1000000; i++) {
            result += Math.pow(i, 2);
        }
        console.log(result);
    };

    return <button onClick={compute}>Heavy Computation</button>;
}

// ✅ 好的做法: 使用防抖
function GoodScrollHandler() {
    useEffect(() => {
        const handleScroll = () => {
            console.log('Scroll position:', window.scrollY);
        };

        // 使用 throttle
        const throttledScroll = throttle(handleScroll, 100);
        window.addEventListener('scroll', throttledScroll);

        return () => window.removeEventListener('scroll', throttledScroll);
    }, []);

    return <div>Good Scroll Handler</div>;
}

// ✅ 好的做法: 图片设置尺寸
function GoodImageGallery() {
    return (
        <div>
            <img src="/image1.jpg" alt="Image 1" width="800" height="600" />
            <img src="/image2.jpg" alt="Image 2" width="800" height="600" />
        </div>
    );
}

export default function App() {
    return (
        <div>
            <ScrollHandler />
            <ImageGallery />
            <DynamicContent />
        </div>
    );
}
