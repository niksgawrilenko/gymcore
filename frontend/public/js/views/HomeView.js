// frontend/public/js/views/HomeView.js

import { escapeHTML, getCurrentUserId } from '../utils/helpers.js';

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
        const isAdmin = this.api.getUserRole() === 'admin';
        
        // ПРОВЕРЯЕМ: Есть ли незавершенная тренировка в памяти?
        const activeWorkout = JSON.parse(localStorage.getItem('gymcore_active_workout'));

        this.container.innerHTML = `
            <section class="quick-actions" style="display: flex; flex-direction: column; gap: 10px;">
                
                ${activeWorkout ? `
                <div class="card active-workout-banner" style="border: 2px solid var(--accent-color); background: rgba(0, 122, 255, 0.05); margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: var(--accent-color); font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">🔥 Идет тренировка</div>
                            <div style="font-weight: 700; font-size: 17px;">${escapeHTML(activeWorkout.title)}</div>
                        </div>
                        <button id="continueWorkoutBtn" class="primary-btn" style="width: auto; padding: 10px 20px; font-size: 14px; box-shadow: none;">Продолжить</button>
                    </div>
                </div>
                ` : ''}

                <button id="openTemplateModalBtn" class="primary-btn">
                    <span>+</span> Начать новую тренировку
                </button>
                
                ${isAdmin ? `
                <a href="#admin" style="display: block; width: 100%; text-align: center; padding: 14px; border-radius: 14px; background: #5856d6; color: white; text-decoration: none; font-weight: 800; font-size: 16px;">
                    🛡️ ПАНЕЛЬ МОДЕРАТОРА
                </a>
                ` : ''}
                
                <a href="#exercises" style="display: block; width: 100%; text-align: center; padding: 14px; border-radius: 14px; border: 1px solid var(--accent-color); color: var(--accent-color); text-decoration: none; font-weight: 600;">
                    🏋️ База упражнений
                </a>

                <a href="#templates" style="display: block; width: 100%; text-align: center; padding: 14px; border-radius: 14px; border: 1px solid var(--accent-color); color: var(--accent-color); text-decoration: none; font-weight: 600;">
                    📋 Мои программы (Шаблоны)
                </a>
                <button id="logoutBtn" style="background: none; border: none; color: var(--text-secondary); text-decoration: underline; cursor: pointer; padding: 10px; font-weight: bold; margin-top: 5px;">
                    🚪 Выйти
                </button>
            </section>

            <section class="recent-history">
                <h2 class="section-title">История</h2>
                <div id="dataContainer">
                    <div class="card empty-state">Загрузка...</div>
                </div>
            </section>

            <div id="templateModal" class="modal-overlay">
                <div class="modal-content" style="height: 60vh;">
                    <div class="modal-header">
                        <h3>Выбор программы</h3>
                        <button id="closeTemplateModalBtn" class="close-btn">Отмена</button>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <button id="emptyWorkoutBtn" class="primary-btn" style="background: var(--surface-color); color: var(--accent-color); border: 1px solid var(--accent-color); box-shadow:none;">
                            + Пустая тренировка
                        </button>
                    </div>
                    <input type="text" id="templateSearchInput" class="set-input" placeholder="🔍 Поиск шаблона..." style="width: 100%; margin-bottom: 15px; text-align: left;">
                    <div id="templateList" style="overflow-y: auto; flex-grow: 1;"></div>
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

        const myId = getCurrentUserId();
        
        // Разделяем шаблоны на личные и глобальные
        const myTemplates = templatesArray.filter(tpl => tpl.user_id === myId);
        const globalTemplates = templatesArray.filter(tpl => tpl.user_id !== myId);

        // Функция-генератор HTML для карточек
        const generateHTML = (tplList, isPersonal) => {
            return tplList.map(tpl => `
                <div class="card exercise-list-item template-card" style="margin-bottom: 10px; border-radius: 10px; cursor: pointer; opacity: ${isPersonal ? '1' : '0.85'};" data-id="${tpl.id}" data-name="${escapeHTML(tpl.name)}">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="font-weight: 600; font-size: 16px;">${escapeHTML(tpl.name)}</div>
                        ${!isPersonal ? '<span style="font-size: 11px; background: var(--bg-color); padding: 2px 6px; border-radius: 4px; color: var(--text-secondary);">🌍</span>' : ''}
                    </div>
                    <div style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">${escapeHTML(tpl.description || (isPersonal ? 'Без описания' : 'Системный шаблон'))}</div>
                </div>
            `).join('');
        };

        templateList.innerHTML = `
            ${myTemplates.length > 0 ? `
                <h4 style="margin-bottom: 10px; color: var(--accent-color); font-size: 13px; text-transform: uppercase;">👤 Мои программы</h4>
                ${generateHTML(myTemplates, true)}
            ` : ''}

            ${globalTemplates.length > 0 ? `
                <h4 style="margin-top: 20px; margin-bottom: 10px; color: var(--text-secondary); font-size: 13px; text-transform: uppercase;">🌍 Общие шаблоны</h4>
                ${generateHTML(globalTemplates, false)}
            ` : ''}
        `;
    }

    handleClick(e) {
        const t = e.target;

        // 1. Продолжить активную тренировку
        if (t.id === 'continueWorkoutBtn') {
            window.location.hash = '#workout';
            return;
        }

        // 2. Открыть модалку выбора шаблона
        if (t.closest('#openTemplateModalBtn')) {
            this.container.querySelector('#templateModal').classList.add('active');
            this.loadTemplatesIntoModal();
            return;
        }

        // 3. Закрыть модалку
        if (t.closest('#closeTemplateModalBtn') || t.id === 'templateModal') {
            this.container.querySelector('#templateModal').classList.remove('active');
            return;
        }

        // 4. Начать пустую тренировку
        if (t.closest('#emptyWorkoutBtn')) {
            if (localStorage.getItem('gymcore_active_workout')) {
                if (!confirm('У вас есть активная тренировка. Начать новую (текущая будет удалена)?')) return;
            }
            
            localStorage.removeItem('gymcore_active_workout');
            sessionStorage.removeItem('currentWorkoutTitle');
            sessionStorage.removeItem('currentTemplateId');
            window.location.hash = '#workout';
            return;
        }

        // 5. Начать тренировку по шаблону
        const templateCard = t.closest('.template-card');
        if (templateCard) {
            if (localStorage.getItem('gymcore_active_workout')) {
                if (!confirm('У вас есть активная тренировка. Сбросить её и начать по этому шаблону?')) return;
            }

            localStorage.removeItem('gymcore_active_workout');
            sessionStorage.setItem('currentWorkoutTitle', templateCard.dataset.name);
            sessionStorage.setItem('currentTemplateId', templateCard.dataset.id);
            window.location.hash = '#workout';
            return;
        }
        
        // 6. Выход из аккаунта
        if (t.closest('#logoutBtn')) {
            if (confirm('Вы точно хотите выйти?')) {
                this.api.logout();
            }
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