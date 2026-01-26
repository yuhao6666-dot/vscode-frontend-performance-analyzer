"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadComponent = BadComponent;
exports.GoodComponent = GoodComponent;
exports.BadList = BadList;
exports.GoodList = GoodList;
exports.OptimizedList = OptimizedList;
const react_1 = __importStar(require("react"));
// ❌ 问题示例：未优化的组件
function BadComponent({ items, filter }) {
    const [data, setData] = (0, react_1.useState)([]);
    // 问题 1: useEffect 缺少清理函数
    (0, react_1.useEffect)(() => {
        const interval = setInterval(() => {
            fetchData().then(setData);
        }, 1000);
        // 缺少清理
    }, []);
    // 问题 2: 在 render 中创建新函数
    return (<div>
            {items.map(item => (
        // 问题 3: 缺少 key
        <div onClick={() => console.log(item)}>
                    {item.name}
                </div>))}
        </div>);
}
// ✅ 优化后的组件
function GoodComponent({ items, filter, onItemClick }) {
    const [data, setData] = (0, react_1.useState)([]);
    // 正确的 useEffect 清理
    (0, react_1.useEffect)(() => {
        const interval = setInterval(() => {
            fetchData().then(setData);
        }, 1000);
        return () => {
            clearInterval(interval);
        };
    }, []);
    // 使用 useMemo 缓存过滤结果
    const filteredItems = (0, react_1.useMemo)(() => {
        return items.filter(item => {
            if (filter === 'active')
                return item.active;
            if (filter === 'inactive')
                return !item.active;
            return true;
        });
    }, [items, filter]);
    // 使用 useCallback 缓存回调函数
    const handleItemClick = (0, react_1.useCallback)((item) => {
        console.log(item);
        onItemClick?.(item);
    }, [onItemClick]);
    return (<div>
            {filteredItems.map(item => (<div key={item.id} onClick={() => handleItemClick(item)}>
                    {item.name}
                </div>))}
        </div>);
}
// ❌ 列表渲染性能问题
function BadList({ items }) {
    return (<div>
            {items.map((item, index) => (
        // 使用 index 作为 key 是反模式
        <div key={index}>
                    <span>{item.name}</span>
                    {/* 在渲染中创建新对象 */}
                    <button style={{ color: 'red' }}>Delete</button>
                </div>))}
        </div>);
}
// ✅ 优化的列表渲染
const buttonStyle = { color: 'red' }; // 提取到组件外
function GoodList({ items }) {
    return (<div>
            {items.map(item => (
        // 使用唯一 ID 作为 key
        <div key={item.id}>
                    <span>{item.name}</span>
                    <button style={buttonStyle}>Delete</button>
                </div>))}
        </div>);
}
// 或者使用 React.memo 优化子组件
const ListItem = react_1.default.memo(({ item, onDelete }) => {
    return (<div>
            <span>{item.name}</span>
            <button onClick={() => onDelete(item.id)}>Delete</button>
        </div>);
});
function OptimizedList({ items, onDelete }) {
    return (<div>
            {items.map(item => (<ListItem key={item.id} item={item} onDelete={onDelete}/>))}
        </div>);
}
async function fetchData() {
    const response = await fetch('/api/data');
    return response.json();
}
//# sourceMappingURL=react-example.js.map