// frontend/public/js/router.js
import HomeView from './views/HomeView.js';
import WorkoutView from './views/WorkoutView.js'; // Используем твое новое название
import ExercisesView from './views/ExercisesView.js';
import TemplatesView from './views/TemplatesView.js';

export class Router {
    constructor(containerId, api) {
        this.container = document.getElementById(containerId);
        this.api = api;
        
        this.routes = {
            '': () => new HomeView(this.container, this.api),
            
            // ТРЕНИРОВКИ
            '#workout': () => new WorkoutView(this.container, this.api),
            '#workout-detail': () => {
                const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                return new WorkoutView(this.container, this.api, id); 
            },

            // ШАБЛОНЫ
            '#templates': () => new TemplatesView(this.container, this.api),
            '#template-create': () => new WorkoutView(this.container, this.api, null, true),
            '#template-edit': () => {
                const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                return new WorkoutView(this.container, this.api, id, true);
            },
            
            '#exercises': () => new ExercisesView(this.container, this.api)
        };

        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute(); 
    }

    handleRoute() {
        const fullHash = window.location.hash;
        const path = fullHash.split('?')[0]; 
        const viewConstructor = this.routes[path] || this.routes[''];
        this.container.innerHTML = ''; 
        viewConstructor(); 
    }
}