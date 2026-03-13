<!-- App.vue - 最简单的版本 -->
<template>
  <div id="app">
    <!-- 这里显示当前路由对应的页面 -->
    <router-view></router-view>
  </div>
</template>

<script setup>
// 如果不需要脚本，可以省略 setup 部分
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body, html {
  height: 100%;
  width: 100%;
}
</style>