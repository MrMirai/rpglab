<script setup>
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/modules/auth'

// При возврате фокуса на вкладку освежаем профиль — presigned-ссылка на
// аватар (avatarUrl) живёт 15 мин, за время простоя вкладки в фоне она могла
// протухнуть. refreshProfileIfStale сам решает, устарели ли данные (throttle),
// поэтому дёргать при каждом visibilitychange безопасно.
const auth = useAuthStore()

function onVisible() {
  if (document.visibilityState === 'visible') {
    auth.refreshProfileIfStale()
  }
}

onMounted(() => document.addEventListener('visibilitychange', onVisible))
onUnmounted(() => document.removeEventListener('visibilitychange', onVisible))
</script>

<template>
  <div id="app">
    <RouterView />
  </div>
</template>
