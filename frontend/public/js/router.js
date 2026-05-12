// frontend/public/js/router.js
import HomeView from './views/HomeView.js';
import WorkoutEditorView from './views/WorkoutEditorView.js'; // 1. Импортируем наш новый единый класс
import ExercisesView from './views/ExercisesView.js';

export class Router {
    constructor(containerId, api) {
        this.container = document.getElementById(containerId);
        this.api = api;
        
        // Словарь наших маршрутов
        this.routes = {
            '': () => new HomeView(this.container, this.api),
            
            // 2. Для новой тренировки вызываем Editor БЕЗ id
            '#workout': () => new WorkoutEditorView(this.container, this.api),
            
            // 3. Для просмотра/правки вызываем Editor С id
            '#workout-detail': () => {
                const params = new URLSearchParams(window.location.hash.split('?')[1]);
                const id = params.get('id');
                return new WorkoutEditorView(this.container, this.api, id); 
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