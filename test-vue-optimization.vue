<template>
  <div>
    <Modal v-model="showModal">
      <div slot="header">删除确认</div>
      <div>确认删除吗？</div>
      <div slot="footer">
        <Button @click="onCancel">取消</Button>
        <Button type="primary" @click="onConfirm">确认</Button>
      </div>
    </Modal>
  </div>
</template>

<script>
export default {
  data() {
    return {
      // 简单对象 - 1层嵌套，不应该报警告
      query: {
        params: {
          name: '',
          group_id: ''
        }
      },

      // 深度嵌套对象 - 3层以上嵌套，应该提示
      deepNestedData: {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep'
              }
            }
          }
        }
      },

      showModal: false
    }
  },

  methods: {
    // iView 组件的正确写法 - 不应该报错
    onDelete(row) {
      this.$Modal.confirm({
        title: '删除确认',
        content: '确认删除吗？',
        'ok-text': '确认',  // 属性名包含连字符，必须用引号
        'cancel-text': '取消',
        onOk: () => {
          this.deleteRow(row);
        }
      });
    },

    // Vue 响应式的正确用法 - 不应该报警告
    onSearch(formData) {
      // 直接修改响应式对象的属性是正常且高效的
      this.query.params.name = formData.name;
      this.query.params.group_id = this.$route.query.group_id;

      // 发起搜索
      this.fetchData();
    },

    fetchData() {
      console.log('Fetching data with params:', this.query.params);
    },

    deleteRow(row) {
      console.log('Deleting row:', row);
    },

    onConfirm() {
      this.showModal = false;
    },

    onCancel() {
      this.showModal = false;
    }
  }
}
</script>
