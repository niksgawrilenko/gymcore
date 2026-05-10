// frontend/public/js/router.js
import HomeView from './views/HomeView.js';
import WorkoutView from './views/WorkoutView.js';
import WorkoutDetailView from './views/WorkoutDetailView.js';

export class Router {
    constructor(containerId, api) {
        this.container = document.getElementById(containerId);
        this.api = api;
        
        // Словарь наших маршрутов
        this.routes = {
            '': () => new HomeView(this.container, this.api),
            '#workout': () => new WorkoutView(this.container, this.api),
            '#workout-detail': () => {
                // Вытаскиваем ID из URL: #workout-detail?id=123
                const params = new URLSearchParams(window.location.hash.split('?')[1]);
                const id = params.get('id');
                return new WorkoutDetailView(this.container, this.api, id);
            }
        };

        // Слушаем изменение URL (когда пользователь нажимает "Назад" или кликает по ссылке)
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Запускаем роутинг при первой загрузке страницы
        this.handleRoute(); 
        
    }

    handleRoute() {
    const fullHash = window.location.hash;
    const path = fullHash.split('?')[0]; // Получаем только '#workout-detail'
    
    const viewConstructor = this.routes[path] || this.routes[''];
    this.container.innerHTML = ''; 
    viewConstructor(); 
    }
}