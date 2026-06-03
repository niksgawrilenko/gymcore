// frontend/public/js/router.js

export class Router {
    constructor(containerId, api) {
        this.container = document.getElementById(containerId);
        this.api = api;
        this.currentView = null;
        
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute(); 
    }

    async handleRoute() {
        const fullHash = window.location.hash;
        const path = fullHash.split('?')[0]; 
        
        const token = localStorage.getItem('gymcore_token');
        const isAuthRoute = path === '#auth'; 

        if (!token && !isAuthRoute) { window.location.hash = '#auth'; return; }
        if (token && isAuthRoute) { window.location.hash = ''; return; }

        if (this.currentView && typeof this.currentView.destroy === 'function') {
            this.currentView.destroy();
        }

        // Включаем лоадер, пока файл скачивается
        this.container.innerHTML = '<div style="text-align: center; padding: 50px; color: var(--text-secondary);">Загрузка...</div>';

        this.updateBottomNav(path);
        this.updateGlobalActiveWorkout(); 

        // Теперь мы просто возвращаем КЛАСС экрана из файла, а не создаем его сразу
        const routes = {
            '': async () => (await import('./views/HistoryView.js')).default,
            '#auth': async () => (await import('./views/AuthView.js')).default,
            '#workout': async () => (await import('./views/ActiveWorkoutView.js')).default,
            '#workout-detail': async () => (await import('./views/ActiveWorkoutView.js')).default,
            '#templates': async () => (await import('./views/WorkoutListView.js')).default,
            '#template-create': async () => (await import('./views/TemplateEditView.js')).default,
            '#template-edit': async () => (await import('./views/TemplateEditView.js')).default,
            '#exercises': async () => (await import('./views/ExercisesView.js')).default,
            '#profile': async () => (await import('./views/ProfileView.js')).default,
            '#measurements': async () => (await import('./views/MeasurementsView.js')).default,
            '#stats': async () => (await import('./views/StatsView.js')).default,
            '#settings': async () => (await import('./views/SettingsView.js')).default,
            '#admin': async () => {
                if (this.api.getUserRole() !== 'admin') { window.location.hash = '#'; return null; }
                return (await import('./views/AdminView.js')).default;
            },
            '#shared-ex': async () => (await import('./views/SharedView.js')).default,
            '#shared-template': async () => (await import('./views/SharedView.js')).default
        };

        const viewFetcher = routes[path] || routes[''];
        
        try {
            // 1. Ждем, пока браузер скачает файл
            const ViewClass = await viewFetcher();
            if (!ViewClass) return; // Защита для админки

            // 2. Стираем лоадер ДО того, как экран начнет отрисовку
            this.container.innerHTML = ''; 

            const id = new URLSearchParams(fullHash.split('?')[1]).get('id');

            // 3. Создаем экран с правильными параметрами
            if (path === '#workout-detail' || path === '#template-edit') {
                this.currentView = new ViewClass(this.container, this.api, id);
            } else if (path === '#shared-ex') {
                this.currentView = new ViewClass(this.container, this.api, 'exercise', id);
            } else if (path === '#shared-template') {
                this.currentView = new ViewClass(this.container, this.api, 'template', id);
            } else {
                this.currentView = new ViewClass(this.container, this.api);
            }
        } catch (error) {
            console.error("Ошибка загрузки экрана:", error);
            this.container.innerHTML = '<div class="empty-state">Ошибка загрузки. Попробуйте обновить страницу.</div>';
        }
    }

    updateBottomNav(path) {
        const bottomNav = document.getElementById('bottomNav');
        if (!bottomNav) return;

        const hideNavRoutes = ['#auth', '#workout', '#workout-detail', '#template-create', '#template-edit', '#admin', '#measurements', '#stats', '#settings'];
        if (hideNavRoutes.includes(path) || path.startsWith('#shared')) {
            bottomNav.style.display = 'none';
        } else {
            bottomNav.style.display = 'flex';
            document.querySelectorAll('.nav-item').forEach(item => {
                if (item.dataset.path === path) item.classList.add('active');
                else item.classList.remove('active');
            });
        }
    }

    updateGlobalActiveWorkout() {
        const globalActive = document.getElementById('globalActiveWorkout');
        if (!globalActive) return;

        const saved = localStorage.getItem('gymcore_active_workout');
        if (saved) {
            try {
                const workoutData = JSON.parse(saved);
                if (!workoutData) throw new Error('Пусто');

                globalActive.style.display = 'flex';
                document.getElementById('globalWorkoutTitle').innerText = workoutData.title || 'Тренировка';
                globalActive.onclick = () => window.location.hash = '#workout';

                if (window.globalWorkoutTimerInterval) clearInterval(window.globalWorkoutTimerInterval);
                window.globalWorkoutTimerInterval = setInterval(() => {
                    const timerEl = document.getElementById('globalWorkoutTimer');
                    if (!timerEl) return;
                    const diff = Math.floor((Date.now() - (workoutData.workout_date || Date.now())) / 1000);
                    const m = String(Math.floor(diff / 60)).padStart(2, '0');
                    const s = String(diff % 60).padStart(2, '0');
                    timerEl.innerText = `${m}:${s}`;
                }, 1000);
            } catch (e) {
                globalActive.style.display = 'none';
            }
        } else {
            globalActive.style.display = 'none';
            if (window.globalWorkoutTimerInterval) clearInterval(window.globalWorkoutTimerInterval);
        }
    }
}