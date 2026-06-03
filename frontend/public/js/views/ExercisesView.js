// frontend/public/js/views/ExercisesView.js
import { escapeHTML, getCurrentUserId, debounce } from '../utils/helpers.js';
import { PRIMARY_GROUPS } from '../utils/constants.js'; // Группы мышц для фильтров
import ExerciseModal from '../components/ExerciseModal.js';

export default class ExercisesView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.exercises = [];
        this.exerciseModal = null;
        
        // Текущий активный фильтр (например, 'Грудь')
        this.activeFilter = null; 
        
        this._onClick = this.handleClick.bind(this);
        
        // Задержка на ввод текста для плавности
        this._onInput = debounce(this.handleInput.bind(this), 300);
        
        this.init(); 
    }

    async init() {
        this.container.innerHTML = `<div class="empty-state">Загрузка базы упражнений...</div>`;

        const cached = localStorage.getItem('gymcore_exercises_cache');
        
        if (cached) {
            this.exercises = JSON.parse(cached);
            this.render(); 
            
            // Тихо качаем обновления
            this.api.getExercises().then(res => {
                if (res.success && JSON.stringify(res.data) !== cached) {
                    this.exercises = res.data;
                    localStorage.setItem('gymcore_exercises_cache', JSON.stringify(res.data));
                    this.filterAndRenderList(); // Обновляем только список
                }
            }).catch(() => {});
        } else {
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
        // Создаем чипсы-кнопки
        const filtersHTML = PRIMARY_GROUPS.map(g => 
            `<button class="chip-btn" data-filter="${g}" style="padding: 6px 12px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--surface-color); color: var(--text-color); white-space: nowrap; cursor: pointer;">${g}</button>`
        ).join('');

        // Полностью сохранен твой дизайн, добавлено прилипание поиска и лента фильтров
        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div style="position: sticky; top: 0; background: var(--bg-color); z-index: 10; padding: 15px 0 10px 0;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: var(--surface-color); padding: 12px; border-radius: 12px; border: 1px solid var(--border-color);">
                        <span style="font-size: 18px; font-weight: bold;">База упражнений</span>
                        <button id="openAddModalBtn" style="background: none; border: none; color: var(--accent-color); font-weight: bold; font-size: 28px; cursor: pointer; padding: 0 10px;">+</button>
                    </div>
                    
                    <input type="text" id="exSearchInput" class="set-input" placeholder="🔍 Поиск (например: тяга спина)..." style="width: 100%; margin-bottom: 12px; text-align: left;">
                    
                    <div class="filters-scroll" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none;">
                        <button class="chip-btn active primary-btn" data-filter="" style="padding: 6px 12px; border-radius: 20px; border: none; white-space: nowrap; cursor: pointer;">Все</button>
                        ${filtersHTML}
                    </div>

                </div>
                
                <div id="exercisesList"><div style="text-align:center; color: var(--text-secondary);">Загрузка...</div></div>
            </section>
        `;
        
        if (this.exerciseModal) this.exerciseModal.destroy();
        this.exerciseModal = new ExerciseModal(this.container, this.api, () => {
            this.container.querySelector('#exSearchInput').value = ''; 
            this.loadExercises(); 
        });

        this.container.addEventListener('click', this._onClick);
        this.container.addEventListener('input', this._onInput);
        
        this.filterAndRenderList();
    }

    async loadExercises() {
        const list = this.container.querySelector('#exercisesList');
        try {
            const res = await this.api.getExercises();
            this.exercises = res.data;
            localStorage.setItem('gymcore_exercises_cache', JSON.stringify(this.exercises));
            this.filterAndRenderList();
        } catch (e) {
            if (list) list.innerHTML = `<div class="empty-state" style="color: #ff3b30; padding: 20px;"><b>Ошибка:</b><br>${e.message}</div>`;
        }
    }

    // Тот самый новый умный алгоритм
    filterAndRenderList() {
        const queryInput = this.container.querySelector('#exSearchInput');
        const query = queryInput ? queryInput.value.toLowerCase().trim() : '';
        const searchTerms = query.split(/\s+/).filter(w => w.length > 0);

        let filtered = this.exercises;

        if (this.activeFilter) {
            filtered = filtered.filter(ex => 
                ex.category === this.activeFilter || 
                (ex.primary_groups && ex.primary_groups.includes(this.activeFilter))
            );
        }

        if (searchTerms.length > 0) {
            filtered = filtered.filter(ex => {
                const searchableText = [
                    ex.name, 
                    ex.category, 
                    ...(ex.primary_groups || []), 
                    ...(ex.secondary_muscles || [])
                ].join(' ').toLowerCase();

                return searchTerms.every(term => searchableText.includes(term));
            });
        }

        filtered.sort((a, b) => {
            const usageA = a.usage_count || 0;
            const usageB = b.usage_count || 0;
            if (usageA !== usageB) return usageB - usageA;
            return a.id - b.id; 
        });

        this.renderExercisesList(filtered);
    }

    // Полностью твоя старая роскошная отрисовка!
    renderExercisesList(exercisesArray) {
        const list = this.container.querySelector('#exercisesList');
        if (!list) return;

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
                                    <span class="status-badge status-${ex.moderation_status}">${ex.moderation_status || ''}</span>
                                    <button class="moderate-btn" data-id="${ex.id}" title="На модерацию" style="background:none; border:none; cursor:pointer;">🌐</button>
                                    <button class="share-btn" data-id="${ex.share_id || ''}" title="Поделиться" style="background:none; border:none; cursor:pointer;">🔗</button>
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

        // Фильтры
        if (t.classList.contains('chip-btn')) {
            this.container.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active', 'primary-btn'));
            t.classList.add('active', 'primary-btn');
            this.activeFilter = t.dataset.filter || null;
            this.filterAndRenderList();
            return;
        }

        // Твоя логика вызова модалки
        if (t.closest('#openAddModalBtn')) {
            this.exerciseModal.open();
        }
        
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
            const shareBtn = t.closest('.share-btn');
            const shareId = shareBtn.dataset.id;
            if (shareId && shareId !== 'undefined') {
                const url = `${window.location.origin}/#shared-ex?id=${shareId}`;
                navigator.clipboard.writeText(url);
                alert('Ссылка скопирована! Отправьте её другу.');
            } else {
                alert('Сначала обновите базу упражнений.');
            }
        }
    }

    handleInput(e) {
        if (e.target.id === 'exSearchInput') {
            this.filterAndRenderList();
        }
    }
}