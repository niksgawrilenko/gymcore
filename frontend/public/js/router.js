// frontend/public/js/router.js
import HomeView from './views/HomeView.js';
import WorkoutView from './views/WorkoutView.js';

export class Router {
    constructor(containerId, api) {
        this.container = document.getElementById(containerId);
        this.api = api;
        
        // Словарь наших маршрутов
        this.routes = {
            '': () => new HomeView(this.container, this.api),
            '#workout': () => new WorkoutView(this.container, this.api)
        };

        // Слушаем изменение URL (когда пользователь нажимает "Назад" или кликает по ссылке)
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Запускаем роутинг при первой загрузке страницы
        this.handleRoute(); 
    }

    handleRoute() {
        // Получаем текущий хэш (например, "#workout")
        const hash = window.location.hash;
        
        // Ищем класс для этого хэша, если нет - кидаем на главную ('')
        const viewConstructor = this.routes[hash] || this.routes[''];
        
        // Очищаем старый экран
        this.container.innerHTML = ''; 
        
        // Отрисовываем новый экран
        viewConstructor(); 
    }
}