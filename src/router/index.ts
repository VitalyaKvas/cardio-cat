import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('@/views/WelcomeView.vue'),
    },
    {
      path: '/dashboard',
      redirect: '/',
    },
    {
      path: '/workout',
      redirect: '/',
    },
    {
      path: '/workout/:sessionId',
      name: 'workout-session',
      component: () => import('@/views/WorkoutView.vue'),
      props: true,
    },
    {
      path: '/workout/:sessionId/summary',
      name: 'workout-summary',
      component: () => import('@/views/SummaryView.vue'),
      props: true,
    },
    {
      path: '/participants/:id',
      name: 'participant-detail',
      component: () => import('@/views/ParticipantDetailView.vue'),
      props: true,
    },
    {
      path: '/trash',
      name: 'trash',
      component: () => import('@/views/TrashView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
