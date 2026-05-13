// frontend/public/js/router.js
import HomeView from './views/HomeView.js';
import WorkoutView from './views/WorkoutView.js';
import ExercisesView from './views/ExercisesView.js';
import TemplatesView from './views/TemplatesView.js';
import AuthView from './views/AuthView.js'; // 1. Импортируем новый экран

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
        
        // --- ЗАЩИТА МАРШРУТОВ (Route Guard) ---
        const token = localStorage.getItem('gymcore_token');
        const isAuthRoute = path === '#auth';

        // Если нет токена и мы пытаемся зайти куда-то кроме авторизации -> кидаем на авторизацию
        if (!token && !isAuthRoute) {
            window.location.hash = '#auth';
            return;
        }
        // Если токен есть, а мы пытаемся зайти на страницу логина -> кидаем на главную
        if (token && isAuthRoute) {
            window.location.hash = '';
            return;
        }
        // ----------------------------------------

        if (this.currentView && typeof this.currentView.destroy === 'function') {
            this.currentView.destroy();
        }

        const routes = {
            '': () => new HomeView(this.container, this.api),
            '#auth': () => new AuthView(this.container, this.api), // 2. Добавляем маршрут
            '#workout': () => new WorkoutView(this.container, this.api),
            '#workout-detail': () => {
                const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                return new WorkoutView(this.container, this.api, id); 
            },
            '#templates': () => new TemplatesView(this.container, this.api),
            '#template-create': () => new WorkoutView(this.container, this.api, null, true),
            '#template-edit': () => {
                const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                return new WorkoutView(this.container, this.api, id, true);
            },
            '#exercises': () => new ExercisesView(this.container, this.api)
        };

        const viewConstructor = routes[path] || routes[''];
        this.container.innerHTML = ''; 
        this.currentView = viewConstructor(); 
    }
}