// frontend/public/js/views/HomeView.js
export default class HomeView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <section class="quick-actions">
                <button id="openTemplateModalBtn" class="primary-btn">
                    <span>+</span> Начать тренировку
                </button>
            </section>

            <section class="recent-history">
                <h2 class="section-title">История тренировок</h2>
                <div id="dataContainer">
                    <div class="card empty-state">Загрузка истории...</div>
                </div>
            </section>

            <div id="templateModal" class="modal-overlay">
                <div class="modal-content" style="height: 55vh;">
                    <div class="modal-header">
                        <h3>Выбор тренировки</h3>
                        <button id="closeTemplateModalBtn" class="close-btn">Отмена</button>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <button id="emptyWorkoutBtn" class="primary-btn" style="background-color: var(--surface-color); color: var(--accent-color); border: 1px solid var(--accent-color);">
                            + Пустая тренировка
                        </button>
                    </div>

                    <h4 style="margin-bottom: 10px; color: var(--text-secondary); font-size: 13px; text-transform: uppercase;">Твои шаблоны</h4>
                    <div id="templateList" style="overflow-y: auto; flex-grow: 1;">
                        <div style="text-align: center; color: var(--text-secondary);">Загрузка...</div>
                    </div>
                </div>
            </div>
        `;
        
        this.loadHistory();
        this.bindEvents();
    }

    bindEvents() {
        const modal = this.container.querySelector('#templateModal');
        const openBtn = this.container.querySelector('#openTemplateModalBtn');
        const closeBtn = this.container.querySelector('#closeTemplateModalBtn');
        const emptyBtn = this.container.querySelector('#emptyWorkoutBtn');

        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            this.loadTemplatesIntoModal();
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        // Старт пустой тренировки (очищаем временную память)
        emptyBtn.addEventListener('click', () => {
            localStorage.removeItem('gymcore_active_workout'); // <--- ДОБАВИТЬ ЭТО
            sessionStorage.removeItem('currentWorkoutTitle');
            sessionStorage.removeItem('currentTemplateId');
            window.location.hash = '#workout';
        });
    }

    async loadTemplatesIntoModal() {
        const templateList = this.container.querySelector('#templateList');
        try {
            const response = await this.api.getTemplates();
            if (response.success && response.data.length > 0) {
                // Добавляем атрибут data-name для каждого шаблона
                templateList.innerHTML = response.data.map(tpl => `
                    <div class="card exercise-list-item template-card" style="margin-bottom: 10px; border-radius: 10px; cursor: pointer;" data-id="${tpl.id}" data-name="${tpl.name}">
                        <div style="font-weight: 600; font-size: 16px;">${tpl.name}</div>
                        <div style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">${tpl.description || ''}</div>
                    </div>
                `).join('');

                // ВЕШАЕМ КЛИК НА КАЖДЫЙ ШАБЛОН
                const templateCards = templateList.querySelectorAll('.template-card');
                templateCards.forEach(card => {
                    card.addEventListener('click', () => {
                        localStorage.removeItem('gymcore_active_workout'); // <--- ДОБАВИТЬ ЭТО
                        sessionStorage.setItem('currentWorkoutTitle', card.dataset.name);
                        sessionStorage.setItem('currentTemplateId', card.dataset.id);
                        window.location.hash = '#workout';
                    });
                });
            } else {
                templateList.innerHTML = '<div class="empty-state">Шаблонов пока нет</div>';
            }
        } catch (error) {
            templateList.innerHTML = '<div style="color: red; text-align: center;">Ошибка загрузки</div>';
        }
    }

    // ... (метод loadHistory оставляем без изменений)
    async loadHistory() {
        const dataContainer = this.container.querySelector('#dataContainer');
        try {
            const response = await this.api.getWorkouts();
            if (response.success && response.data.length > 0) {
                dataContainer.innerHTML = response.data.map(workout => {
                    const dateObj = new Date(workout.workout_date);
                    const formattedDate = dateObj.toLocaleDateString('ru-RU', { 
                        day: 'numeric', month: 'long', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                    });
                    return `
                        <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${workout.title}</div>
                                <div style="color: var(--text-secondary); font-size: 13px;">📅 ${formattedDate}</div>
                            </div>
                            <div style="color: var(--accent-color); font-weight: bold;">></div>
                        </div>
                    `;
                }).join('');
            } else {
                dataContainer.innerHTML = '<div class="empty-state">Вы еще не провели ни одной тренировки</div>';
            }
        } catch (error) {
            dataContainer.innerHTML = '<div class="empty-state" style="color: #ff3b30;">Ошибка загрузки истории</div>';
        }
    }
}