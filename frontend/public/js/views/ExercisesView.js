// frontend/public/js/views/ExercisesView.js
import { escapeHTML, getCurrentUserId } from '../utils/helpers.js';
import ExerciseModal from '../components/ExerciseModal.js'; // Импортируем компонент!

export default class ExercisesView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.exercises = [];
        this.exerciseModal = null;
        
        this._onClick = this.handleClick.bind(this);
        this._onInput = this.handleInput.bind(this);
        
        this.init(); // Запускаем инициализацию вместо render()
    }

    async init() {
        // Показываем заглушку
        this.container.innerHTML = `<div class="empty-state">Загрузка базы упражнений...</div>`;

        // Проверяем кэш телефона
        const cached = localStorage.getItem('gymcore_exercises_cache');
        
        if (cached) {
            this.exercises = JSON.parse(cached);
            this.render(); // Отрисовываем мгновенно из памяти
            
            // В фоне тихо проверяем обновления с сервера
            this.api.getExercises().then(res => {
                if (res.success && JSON.stringify(res.data) !== cached) {
                    this.exercises = res.data;
                    localStorage.setItem('gymcore_exercises_cache', JSON.stringify(res.data));
                    this.render(); // Обновляем список, если есть новые упражнения
                }
            }).catch(() => {});
        } else {
            // Если зашел впервые - качаем с сервера
            try {
                const res = await this.api.getExercises();
                if (res.success) {
                    this.exercises = res.data;
                    localStorage.setItem('gymcore_exercises_cache', JSON.stringify(res.data));
                    this.render();
                }
            } catch (e) {
                this.container.innerHTML = `<div class="empty-state">Ошибка загрузки</div>`;
            }
        }
    }

    destroy() {
        if (this.exerciseModal) this.exerciseModal.destroy();
        this.container.removeEventListener('click', this._onClick);
        this.container.removeEventListener('input', this._onInput);
        document.body.classList.remove('modal-open');
    }

    async render() {
        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--surface-color); padding: 12px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <a href="#" style="color: var(--accent-color); text-decoration: none; font-weight: 600;">← Назад</a>
                    <button id="openAddModalBtn" style="background: none; border: none; color: var(--accent-color); font-weight: bold; font-size: 28px; cursor: pointer; padding: 0 10px;">+</button>
                </div>
                
                <h2 style="margin-bottom: 15px; font-size: 24px;">База упражнений</h2>
                <input type="text" id="exSearchInput" class="set-input" placeholder="🔍 Поиск упражнения..." style="width: 100%; margin-bottom: 20px; text-align: left;">
                
                <div id="exercisesList"><div style="text-align:center; color: var(--text-secondary);">Загрузка...</div></div>
            </section>
        `;
        
        // Инициализируем наш новый умный компонент
        if (this.exerciseModal) this.exerciseModal.destroy();
        this.exerciseModal = new ExerciseModal(this.container, this.api, () => {
            this.container.querySelector('#exSearchInput').value = ''; 
            this.loadExercises(); // Перезагружаем список при успешном сохранении
        });

        this.container.addEventListener('click', this._onClick);
        this.container.addEventListener('input', this._onInput);
        
        await this.loadExercises();
    }

    async loadExercises() {
        const list = this.container.querySelector('#exercisesList');
        try {
            const res = await this.api.getExercises();
            this.exercises = res.data;
            this.renderExercisesList(this.exercises);
        } catch (e) {
            list.innerHTML = `<div class="empty-state" style="color: #ff3b30; padding: 20px;"><b>Ошибка:</b><br>${e.message}</div>`;
        }
    }

    renderExercisesList(exercisesArray) {
        const list = this.container.querySelector('#exercisesList');
        if (exercisesArray.length === 0) {
            list.innerHTML = '<div class="empty-state">Упражнения не найдены</div>';
            return;
        }

        const myId = getCurrentUserId();
        const myExercises = exercisesArray.filter(ex => ex.user_id === myId);
        const globalExercises = exercisesArray.filter(ex => ex.user_id !== myId);

        const generateHTML = (exList, isPersonal) => {
            if (exList.length === 0) return '';
            
            const grouped = {};
            exList.forEach(ex => {
                let cat = 'Без категории';
                if (ex.primary_groups && ex.primary_groups.length > 0) cat = ex.primary_groups[0];
                else if (ex.category) cat = ex.category;
                
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(ex);
            });

            return Object.keys(grouped).map(category => `
                <div style="margin-bottom: 15px;">
                    <h4 style="margin-bottom: 8px; color: var(--text-secondary); font-size: 13px; text-transform: uppercase; padding-left: 5px;">${escapeHTML(category)}</h4>
                    ${grouped[category].map(ex => {
                        let tags = [];
                        if (ex.primary_groups) tags.push(...ex.primary_groups);
                        else if (ex.category) tags.push(ex.category);
                        if (ex.secondary_muscles) tags.push(...ex.secondary_muscles);
                        
                        const displayTags = tags.slice(0, 3).map(t => `<span style="background: var(--bg-color); color: var(--text-secondary); padding: 2px 6px; border-radius: 4px; font-size: 10px; border: 1px solid var(--border-color);">${escapeHTML(t)}</span>`).join('');
                        const extraTags = tags.length > 3 ? `<span style="font-size: 10px; color: var(--text-secondary);">+${tags.length - 3}</span>` : '';

                        return `
                        <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 12px 16px;">
                            <div>
                                <div style="font-weight: 600; font-size: 16px;">${escapeHTML(ex.name)}</div>
                                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                                    ${displayTags} ${extraTags}
                                </div>
                            </div>
                            
                            ${isPersonal ? `
                                <div style="display: flex; gap: 10px; align-items: center; margin-left: 10px; flex-wrap: wrap; justify-content: flex-end;">
                                    <span class="status-badge status-${ex.moderation_status}">${ex.moderation_status}</span>
                                    <button class="moderate-btn" data-id="${ex.id}" title="На модерацию" style="background:none; border:none; cursor:pointer;">🌐</button>
                                    <button class="share-btn" data-id="${ex.share_id}" title="Поделиться" style="background:none; border:none; cursor:pointer;">🔗</button>
                                    <button class="edit-btn" data-id="${ex.id}" style="background:none; border:none; font-size:18px; cursor:pointer; color:var(--accent-color);">✎</button>
                                    <button class="delete-btn" data-id="${ex.id}" style="background:none; border:none; font-size:18px; color:#ff3b30; cursor:pointer;">🗑</button>
                                </div>
                            ` : `
                                <div style="background: var(--bg-color); padding: 4px 8px; border-radius: 6px; font-size: 11px; color: var(--text-secondary); font-weight: bold; margin-left: 10px;">
                                    🌍 Общее
                                </div>
                            `}
                        </div>
                    `}).join('')}
                </div>
            `).join('');
        };

        list.innerHTML = `
            ${myExercises.length > 0 ? `
                <h3 style="margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">👤 Мои упражнения</h3>
                ${generateHTML(myExercises, true)}
            ` : ''}

            ${globalExercises.length > 0 ? `
                <h3 style="margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">🌍 Общая база</h3>
                ${generateHTML(globalExercises, false)}
            ` : ''}
        `;
    }

    async handleClick(e) {
        const t = e.target;

        // Открытие модалки создания
        if (t.closest('#openAddModalBtn')) {
            this.exerciseModal.open();
        }
        
        // Открытие модалки редактирования
        const editBtn = t.closest('.edit-btn');
        if (editBtn) {
            const ex = this.exercises.find(e => e.id === parseInt(editBtn.dataset.id));
            this.exerciseModal.open(ex);
        }

        const deleteBtn = t.closest('.delete-btn');
        if (deleteBtn) {
            if (confirm('Точно удалить упражнение из базы?')) {
                await this.api.deleteExercise(deleteBtn.dataset.id);
                this.loadExercises();
            }
        }

        if (t.closest('.moderate-btn')) {
            const id = t.closest('.moderate-btn').dataset.id;
            if (confirm('Отправить на проверку модератору, чтобы упражнение стало общим?')) {
                await this.api.sendExerciseToModeration(id);
                this.loadExercises();
            }
        }

        if (t.closest('.share-btn')) {
            const shareId = t.closest('.share-btn').dataset.id;
            const url = `${window.location.origin}/#shared-ex?id=${shareId}`;
            navigator.clipboard.writeText(url);
            alert('Ссылка скопирована! Отправьте её другу.');
        }
    }

    handleInput(e) {
        if (e.target.id === 'exSearchInput') {
            const query = e.target.value.toLowerCase();
            const filtered = this.exercises.filter(ex => {
                const inName = ex.name.toLowerCase().includes(query);
                const inCat = ex.category && ex.category.toLowerCase().includes(query);
                const inPrimary = ex.primary_groups && ex.primary_groups.some(g => g.toLowerCase().includes(query));
                const inSecondary = ex.secondary_muscles && ex.secondary_muscles.some(m => m.toLowerCase().includes(query));
                
                return inName || inCat || inPrimary || inSecondary;
            });
            this.renderExercisesList(filtered);
        }
    }
}