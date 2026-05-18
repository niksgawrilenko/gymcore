// frontend/public/js/router.js
import HomeView from './views/HistoryView.js';
import WorkoutView from './views/ActiveWorkoutView.js';
import TemplateEditView from './views/TemplateEditView.js';
import ExercisesView from './views/ExercisesView.js';
import TemplatesView from './views/WorkoutListView.js';
import AuthView from './views/AuthView.js'; 
import AdminView from './views/AdminView.js';
import SharedView from './views/SharedView.js';
import ProfileView from './views/ProfileView.js';

export class Router {
    constructor(containerId, api) {
        this.container = document.getElementById(containerId);
        this.api = api;
        this.currentView = null;
        
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute(); 
    }

    handleRoute() {
        const fullHash = window.location.hash;
        const path = fullHash.split('?')[0]; 
        
        const token = localStorage.getItem('gymcore_token');
        const isAuthRoute = path === '#auth';

        if (!token && !isAuthRoute) { window.location.hash = '#auth'; return; }
        if (token && isAuthRoute) { window.location.hash = ''; return; }

        if (this.currentView && typeof this.currentView.destroy === 'function') {
            this.currentView.destroy();
        }

        const routes = {
            '': () => new HomeView(this.container, this.api),
            '#auth': () => new AuthView(this.container, this.api),
            '#workout': () => new WorkoutView(this.container, this.api),
            '#workout-detail': () => {
                const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                return new WorkoutView(this.container, this.api, id); 
            },
            '#templates': () => new TemplatesView(this.container, this.api),
            '#template-create': () => new TemplateEditView(this.container, this.api),
            '#template-edit': () => {
                const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                return new TemplateEditView(this.container, this.api, id);
            },
            '#exercises': () => new ExercisesView(this.container, this.api),
            '#profile': () => new ProfileView(this.container, this.api),
            '#admin': () => {
                if (this.api.getUserRole() !== 'admin') { window.location.hash = '#'; return null; }
                return new AdminView(this.container, this.api);
            },
            '#shared-ex': () => {
                const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                return new SharedView(this.container, this.api, 'exercise', id);
            },
            '#shared-template': () => {
                const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                return new SharedView(this.container, this.api, 'template', id);
            }
        };

        this.updateBottomNav(path);
        this.updateGlobalActiveWorkout(); // <-- Запускаем проверку активной тренировки при каждом переходе

        const viewConstructor = routes[path] || routes[''];
        this.container.innerHTML = ''; 
        const nextView = viewConstructor();
        if (nextView) this.currentView = nextView;
    }

    updateBottomNav(path) {
        const bottomNav = document.getElementById('bottomNav');
        if (!bottomNav) return;

        const hideNavRoutes = ['#auth', '#workout', '#workout-detail', '#template-create', '#template-edit', '#admin'];
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