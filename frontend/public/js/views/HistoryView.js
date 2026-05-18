import { escapeHTML } from '../utils/helpers.js';

export default class HomeView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this._onClick = this.handleClick.bind(this);
        this.render();
    }

    destroy() {
        this.container.removeEventListener('click', this._onClick);
    }

    render() {
        this.container.innerHTML = `
            <section class="recent-history">
                <h2 class="section-title" style="margin-top: 5px;">История тренировок</h2>
                <div id="dataContainer">
                    <div class="empty-state">Загрузка...</div>
                </div>
            </section>
        `;
        
        this.container.addEventListener('click', this._onClick);
        this.loadHistory();
    }

    async loadHistory() {
        const dataContainer = this.container.querySelector('#dataContainer');
        try {
            const response = await this.api.getWorkouts();
            if (response.success && response.data.length > 0) {
                dataContainer.innerHTML = response.data.map(workout => {
                    const dateObj = new Date(workout.workout_date);
                    const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    return `
                        <a href="#workout-detail?id=${workout.id}" class="card" style="display: flex; justify-content: space-between; align-items: center; text-decoration: none; color: inherit;">
                            <div>
                                <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${escapeHTML(workout.title)}</div>
                                <div style="color: var(--text-secondary); font-size: 13px;">📅 ${formattedDate}</div>
                            </div>
                            <div style="color: var(--accent-color); font-weight: bold;">></div>
                        </a>
                    `;
                }).join('');
            } else {
                dataContainer.innerHTML = '<div class="empty-state">Вы еще не провели ни одной тренировки</div>';
            }
        } catch (error) {
            dataContainer.innerHTML = '<div class="empty-state" style="color: #ff3b30;">Ошибка загрузки истории</div>';
        }
    }

    handleClick(e) {
        if (e.target.id === 'continueWorkoutBtn') {
            window.location.hash = '#workout';
        }
    }
}