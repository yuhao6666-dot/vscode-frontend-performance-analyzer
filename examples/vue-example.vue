<template>
  <!-- ❌ 问题：列表渲染缺少 key -->
  <div class="bad-list">
    <div v-for="item in items">
      {{ item.name }}
    </div>
  </div>

  <!-- ✅ 正确：添加 key -->
  <div class="good-list">
    <div v-for="item in items" :key="item.id">
      {{ item.name }}
    </div>
  </div>

  <!-- ✅ 使用计算属性缓存过滤结果 -->
  <div>
    <div v-for="item in filteredItems" :key="item.id">
      {{ item.name }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const items = ref([]);
const filter = ref('all');

// ❌ 问题：data 中包含复杂对象
const badData = ref({
  nested: {
    deep: {
      value: []
    }
  }
});

// ✅ 使用计算属性
const filteredItems = computed(() => {
  if (filter.value === 'active') {
    return items.value.filter(item => item.active);
  }
  return items.value;
});

// ❌ 问题：onMounted 中添加监听器但未清理
function badSetup() {
  onMounted(() => {
    window.addEventListener('scroll', handleScroll);
    // 缺少 onUnmounted 清理
  });
}

// ✅ 正确：在 onUnmounted 中清理
let scrollHandler;

onMounted(() => {
  scrollHandler = () => {
    console.log('Scrolling');
  };
  window.addEventListener('scroll', scrollHandler);
});

onUnmounted(() => {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
  }
});

// ❌ 问题：未清理的定时器
function badTimer() {
  onMounted(() => {
    setInterval(() => {
      console.log('Polling');
    }, 1000);
  });
}

// ✅ 正确：清理定时器
let timerId;

onMounted(() => {
  timerId = setInterval(() => {
    console.log('Polling');
  }, 1000);
});

onUnmounted(() => {
  if (timerId) {
    clearInterval(timerId);
  }
});

// ✅ 使用 watch 时也要注意清理
const unwatch = watch(
  () => filter.value,
  (newValue) => {
    console.log('Filter changed:', newValue);
  }
);

onUnmounted(() => {
  unwatch();
});

function handleScroll() {
  console.log('Scrolling');
}
</script>

<script>
// Options API 示例

export default {
  data() {
    return {
      items: [],
      filter: 'all',
      // ❌ 问题：复杂的响应式对象
      complexData: {
        nested: {
          array: new Array(1000).fill(0)
        }
      }
    };
  },

  computed: {
    // ✅ 使用计算属性缓存
    filteredItems() {
      if (this.filter === 'active') {
        return this.items.filter(item => item.active);
      }
      return this.items;
    }
  },

  mounted() {
    // ❌ 问题：添加监听器但未清理
    window.addEventListener('resize', this.handleResize);

    // ❌ 问题：未保存定时器 ID
    setInterval(() => {
      this.fetchData();
    }, 1000);
  },

  // ✅ 在 beforeUnmount 中清理
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },

  methods: {
    handleResize() {
      console.log('Window resized');
    },

    async fetchData() {
      const response = await fetch('/api/data');
      this.items = await response.json();
    }
  }
};
</script>

<style scoped>
.bad-list {
  /* 样式 */
}

.good-list {
  /* 样式 */
}
</style>
