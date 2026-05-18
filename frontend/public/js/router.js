// frontend/public/js/router.js
import HistoryView from './views/HistoryView.js';
import ActiveWorkoutView from './views/ActiveWorkoutView.js';
import ExercisesView from './views/ExercisesView.js';
import WorkoutListView from './views/WorkoutListView.js';
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
            '': () => new HistoryView(this.container, this.api),
            '#auth': () => new AuthView(this.container, this.api),
            '#workout': () => new ActiveWorkoutView(this.container, this.api),
            '#workout-detail': () => {
                const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                return new ActiveWorkoutView(this.container, this.api, id); 
            },
            '#templates': () => new WorkoutListView(this.container, this.api),
            '#template-create': () => new ActiveWorkoutView(this.container, this.api, null, true),
            '#template-edit': () => {
                const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                return new ActiveWorkoutView(this.container, this.api, id, true);
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

        const viewConstructor = routes[path] || routes[''];
        this.container.innerHTML = ''; 
        const nextView = viewConstructor();
        if (nextView) this.currentView = nextView;
    }

    updateBottomNav(path) {
        const bottomNav = document.getElementById('bottomNav');
        const globalActive = document.getElementById('globalActiveWorkout');
        if (!bottomNav) return;

        const hideNavRoutes = ['#auth', '#workout', '#workout-detail', '#template-create', '#template-edit', '#admin'];
        const isHiddenRoute = hideNavRoutes.includes(path) || path.startsWith('#shared');

        if (isHiddenRoute) {
            bottomNav.style.display = 'none';
            if (globalActive) globalActive.style.display = 'none'; // Прячем виджет внутри самой тренировки
        } else {
            bottomNav.style.display = 'flex';
            document.querySelectorAll('.nav-item').forEach(item => {
                if (item.dataset.path === path) item.classList.add('active');
                else item.classList.remove('active');
            });
            this.updateGlobalActiveWorkout(); // Показываем виджет, если есть тренировка
        }
    }

    updateGlobalActiveWorkout() {
        const globalActive = document.getElementById('globalActiveWorkout');
        if (!globalActive) return;

        const saved = localStorage.getItem('gymcore_active_workout');
        if (saved) {
            const workoutData = JSON.parse(saved);
            globalActive.style.display = 'flex';
            
            // Название тренировки
            document.getElementById('globalWorkoutTitle').innerText = workoutData.title || 'Тренировка';
            
            // Клик по виджету возвращает в тренировку
            globalActive.onclick = () => window.location.hash = '#workout';

            // Глобальный таймер
            if (window.globalWorkoutTimerInterval) clearInterval(window.globalWorkoutTimerInterval);
            window.globalWorkoutTimerInterval = setInterval(() => {
                const timerEl = document.getElementById('globalWorkoutTimer');
                if (!timerEl) return;
                const diff = Math.floor((Date.now() - workoutData.workout_date) / 1000);
                const m = String(Math.floor(diff / 60)).padStart(2, '0');
                const s = String(diff % 60).padStart(2, '0');
                timerEl.innerText = `${m}:${s}`;
            }, 1000);
        } else {
            globalActive.style.display = 'none';
            if (window.globalWorkoutTimerInterval) clearInterval(window.globalWorkoutTimerInterval);
        }
    }
}