// frontend/public/js/views/HomeView.js
export default class HomeView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.render();
    }

    render() {
        // Рисуем интерфейс главного экрана
        this.container.innerHTML = `
            <section class="quick-actions">
                <a href="#workout" class="primary-btn" style="text-decoration: none;">
                    <span>+</span> Начать тренировку
                </a>
            </section>

            <section class="recent-history">
                <h2 class="section-title">База упражнений</h2>
                <div id="dataContainer">
                    <div class="card empty-state">Загрузка данных...</div>
                </div>
            </section>
        `;
        
        // Как только нарисовали, идем на сервер за данными
        this.loadData();
    }

    async loadData() {
        const dataContainer = this.container.querySelector('#dataContainer');
        try {
            const response = await this.api.getExercises();
            if (response.success && response.data.length > 0) {
                dataContainer.innerHTML = response.data.map(ex => `
                    <div class="card">
                        <div style="font-weight: 600; font-size: 16px;">${ex.name}</div>
                        <div style="color: var(--text-secondary); font-size: 14px; margin-top: 4px;">
                            ${ex.category} • ${ex.exercise_type === 'cardio' ? '🏃 Кардио' : '🏋️ Силовое'}
                        </div>
                    </div>
                `).join('');
            } else {
                dataContainer.innerHTML = '<div class="empty-state">База пуста</div>';
            }
        } catch (error) {
            dataContainer.innerHTML = '<div class="empty-state" style="color: #ff3b30;">Ошибка соединения с сервером</div>';
        }
    }
}