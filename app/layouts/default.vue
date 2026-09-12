<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
