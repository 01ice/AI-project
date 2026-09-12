<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="container-page flex-1 py-6 sm:py-8">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
