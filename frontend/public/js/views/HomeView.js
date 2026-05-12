// frontend/public/js/views/HomeView.js

import { escapeHTML } from '../utils/helpers.js';

export default class HomeView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.templates = []; 
        
        // Привязываем контекст для правильного удаления событий
        this._onClick = this.handleClick.bind(this);
        this._onInput = this.handleInput.bind(this);
        
        this.render();
    }

    destroy() {
        this.container.removeEventListener('click', this._onClick);
        this.container.removeEventListener('input', this._onInput);
    }

    render() {
        this.container.innerHTML = `
            <section class="quick-actions" style="display: flex; flex-direction: column; gap: 10px;">
                <button id="openTemplateModalBtn" class="primary-btn">
                    <span>+</span> Начать тренировку
                </button>
                
                <a href="#exercises" style="display: block; width: 100%; text-align: center; padding: 14px; border-radius: 14px; border: 1px solid var(--accent-color); color: var(--accent-color); text-decoration: none; font-weight: 600; font-size: 16px;">
                    🏋️ База упражнений
                </a>
                <a href="#templates" style="display: block; width: 100%; text-align: center; padding: 14px; border-radius: 14px; border: 1px solid var(--accent-color); color: var(--accent-color); text-decoration: none; font-weight: 600; font-size: 16px;">
                    📋 Мои программы (Шаблоны)
                </a>
            </section>

            <section class="recent-history">
                <h2 class="section-title">История тренировок</h2>
                <div id="dataContainer">
                    <div class="card empty-state">Загрузка истории...</div>
                </div>
            </section>

            <div id="templateModal" class="modal-overlay">
                <div class="modal-content" style="height: 60vh;">
                    <div class="modal-header">
                        <h3>Выбор тренировки</h3>
                        <button id="closeTemplateModalBtn" class="close-btn">Отмена</button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <button id="emptyWorkoutBtn" class="primary-btn" style="background-color: var(--surface-color); color: var(--accent-color); border: 1px solid var(--accent-color);">
                            + Пустая тренировка
                        </button>
                    </div>

                    <h4 style="margin-bottom: 10px; color: var(--text-secondary); font-size: 13px; text-transform: uppercase;">Твои шаблоны</h4>
                    <input type="text" id="templateSearchInput" class="set-input" placeholder="🔍 Поиск шаблона..." style="width: 100%; margin-bottom: 10px; text-align: left;">
                    
                    <div id="templateList" style="overflow-y: auto; flex-grow: 1;">
                        <div style="text-align: center; color: var(--text-secondary);">Загрузка...</div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.addEventListener('click', this._onClick);
        this.container.addEventListener('input', this._onInput);
        
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

    async loadTemplatesIntoModal() {
        const templateList = this.container.querySelector('#templateList');
        try {
            const response = await this.api.getTemplates();
            if (response.success) {
                this.templates = response.data;
                this.renderTemplateList(this.templates);
            }
        } catch (error) {
            templateList.innerHTML = '<div style="color: red; text-align: center;">Ошибка загрузки</div>';
        }
    }

    renderTemplateList(templatesArray) {
        const templateList = this.container.querySelector('#templateList');
        if (templatesArray.length === 0) {
            templateList.innerHTML = '<div class="empty-state">Шаблоны не найдены</div>';
            return;
        }

        templateList.innerHTML = templatesArray.map(tpl => `
            <div class="card exercise-list-item template-card" style="margin-bottom: 10px; border-radius: 10px; cursor: pointer;" data-id="${tpl.id}" data-name="${escapeHTML(tpl.name)}">
                <div style="font-weight: 600; font-size: 16px;">${escapeHTML(tpl.name)}</div>
                <div style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">${escapeHTML(tpl.description || '')}</div>
            </div>
        `).join('');
    }

    handleClick(e) {
        const t = e.target;

        if (t.closest('#openTemplateModalBtn')) {
            this.container.querySelector('#templateModal').classList.add('active');
            this.loadTemplatesIntoModal();
        }

        if (t.closest('#closeTemplateModalBtn') || t.id === 'templateModal') {
            this.container.querySelector('#templateModal').classList.remove('active');
        }

        if (t.closest('#emptyWorkoutBtn')) {
            localStorage.removeItem('gymcore_active_workout');
            sessionStorage.removeItem('currentWorkoutTitle');
            sessionStorage.removeItem('currentTemplateId');
            window.location.hash = '#workout';
        }

        const templateCard = t.closest('.template-card');
        if (templateCard) {
            localStorage.removeItem('gymcore_active_workout');
            sessionStorage.setItem('currentWorkoutTitle', templateCard.dataset.name);
            sessionStorage.setItem('currentTemplateId', templateCard.dataset.id);
            window.location.hash = '#workout';
        }
    }

    handleInput(e) {
        if (e.target.id === 'templateSearchInput') {
            const query = e.target.value.toLowerCase();
            const filtered = this.templates.filter(tpl => tpl.name.toLowerCase().includes(query));
            this.renderTemplateList(filtered);
        }
    }
}