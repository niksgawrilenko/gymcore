// frontend/public/js/views/ExercisesView.js

import { escapeHTML } from '../utils/helpers.js';

export default class ExercisesView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.exercises = [];
        this.editingId = null;
        
        this._onClick = this.handleClick.bind(this);
        this._onInput = this.handleInput.bind(this);
        
        this.render();
    }

    destroy() {
        this.container.removeEventListener('click', this._onClick);
        this.container.removeEventListener('input', this._onInput);
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

            <div id="exFormModal" class="modal-overlay">
                <div class="modal-content" style="height: auto; max-height: 80vh;">
                    <div class="modal-header">
                        <h3 id="modalTitle">Новое упражнение</h3>
                        <button id="closeExForm" class="close-btn">✕</button>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px;">
                        <div>
                            <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 5px; display: block;">Название</label>
                            <input type="text" id="exNameInput" class="set-input" style="text-align: left;" placeholder="Например: Жим лежа">
                        </div>
                        <div>
                            <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 5px; display: block;">Мышечная группа</label>
                            <select id="exCategoryInput" class="set-input" style="text-align: left; appearance: auto; background-color: var(--bg-color);">
                                <option value="Грудь">Грудь</option><option value="Спина">Спина</option><option value="Ноги">Ноги</option>
                                <option value="Руки">Руки</option><option value="Плечи">Плечи</option><option value="Пресс">Пресс</option>
                                <option value="Кардио">Кардио</option><option value="Всё тело">Всё тело</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 5px; display: block;">Тип тренировки</label>
                            <select id="exTypeInput" class="set-input" style="text-align: left; appearance: auto; background-color: var(--bg-color);">
                                <option value="strength">Силовое (Вес + Повторы)</option><option value="cardio">Кардио (Время + Расстояние)</option>
                            </select>
                        </div>
                    </div>
                    
                    <button id="saveExBtn" class="primary-btn">Сохранить</button>
                </div>
            </div>
        `;
        
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
            list.innerHTML = '<div class="empty-state" style="color: #ff3b30;">Ошибка загрузки базы данных</div>';
        }
    }

    // Найди в ExercisesView.js функцию renderExercisesList и замени её на эту:

    renderExercisesList(exercisesArray) {
        const list = this.container.querySelector('#exercisesList');
        if (exercisesArray.length === 0) {
            list.innerHTML = '<div class="empty-state">Упражнения не найдены</div>';
            return;
        }

        const myId = getCurrentUserId();
        
        // Разделяем упражнения на личные и глобальные
        const myExercises = exercisesArray.filter(ex => ex.user_id === myId);
        const globalExercises = exercisesArray.filter(ex => ex.user_id !== myId);

        // Функция-генератор HTML для списка
        const generateHTML = (exList, isPersonal) => {
            if (exList.length === 0) return '';
            
            const grouped = {};
            exList.forEach(ex => {
                if (!grouped[ex.category]) grouped[ex.category] = [];
                grouped[ex.category].push(ex);
            });

            return Object.keys(grouped).map(category => `
                <div style="margin-bottom: 15px;">
                    <h4 style="margin-bottom: 8px; color: var(--text-secondary); font-size: 13px; text-transform: uppercase; padding-left: 5px;">${escapeHTML(category)}</h4>
                    ${grouped[category].map(ex => `
                        <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 12px 16px;">
                            <div>
                                <div style="font-weight: 600; font-size: 16px;">${escapeHTML(ex.name)}</div>
                                <div style="color: var(--text-secondary); font-size: 12px; margin-top: 4px;">${ex.exercise_type === 'cardio' ? '🏃 Кардио' : '🏋️ Силовое'}</div>
                            </div>
                            
                            ${isPersonal ? `
                                <div style="display: flex; gap: 15px;">
                                    <button class="edit-btn" data-id="${ex.id}" style="background: none; border: none; font-size: 18px; cursor: pointer; color: var(--accent-color);">✎</button>
                                    <button class="delete-btn" data-id="${ex.id}" style="background: none; border: none; font-size: 18px; color: #ff3b30; cursor: pointer;">🗑</button>
                                </div>
                            ` : `
                                <div style="background: var(--bg-color); padding: 4px 8px; border-radius: 6px; font-size: 11px; color: var(--text-secondary); font-weight: bold;">
                                    🌍 Общее
                                </div>
                            `}
                        </div>
                    `).join('')}
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

    openModal(id = null) {
        this.editingId = id;
        const modal = this.container.querySelector('#exFormModal');
        const title = this.container.querySelector('#modalTitle');
        const nameInput = this.container.querySelector('#exNameInput');
        const catInput = this.container.querySelector('#exCategoryInput');
        const typeInput = this.container.querySelector('#exTypeInput');

        if (id) {
            const ex = this.exercises.find(e => e.id === parseInt(id));
            title.innerText = 'Правка упражнения';
            nameInput.value = ex.name;
            catInput.value = ex.category;
            typeInput.value = ex.exercise_type;
        } else {
            title.innerText = 'Новое упражнение';
            nameInput.value = '';
            catInput.value = 'Грудь';
            typeInput.value = 'strength';
        }

        modal.classList.add('active');
    }

    async handleClick(e) {
        const t = e.target;

        if (t.closest('#openAddModalBtn')) this.openModal();
        
        const editBtn = t.closest('.edit-btn');
        if (editBtn) this.openModal(editBtn.dataset.id);
        
        if (t.closest('#closeExForm') || t.id === 'exFormModal') {
            this.container.querySelector('#exFormModal').classList.remove('active');
        }

        const deleteBtn = t.closest('.delete-btn');
        if (deleteBtn) {
            if (confirm('Точно удалить упражнение из базы?')) {
                await this.api.deleteExercise(deleteBtn.dataset.id);
                this.loadExercises();
            }
        }

        if (t.closest('#saveExBtn')) {
            const name = this.container.querySelector('#exNameInput').value.trim();
            const category = this.container.querySelector('#exCategoryInput').value;
            const type = this.container.querySelector('#exTypeInput').value;

            if (!name) return alert('Введите название!');

            const btn = this.container.querySelector('#saveExBtn');
            btn.innerText = '⏳...';
            btn.disabled = true;

            try {
                const payload = { name, category, exercise_type: type };
                if (this.editingId) await this.api.updateExercise(this.editingId, payload);
                else await this.api.createExercise(payload);
                
                this.container.querySelector('#exFormModal').classList.remove('active');
                this.container.querySelector('#exSearchInput').value = ''; 
                this.loadExercises();
            } catch (err) {
                alert('Ошибка при сохранении');
            } finally {
                btn.innerText = 'Сохранить';
                btn.disabled = false;
            }
        }
    }

    handleInput(e) {
        if (e.target.id === 'exSearchInput') {
            const query = e.target.value.toLowerCase();
            const filtered = this.exercises.filter(ex => 
                ex.name.toLowerCase().includes(query) || 
                ex.category.toLowerCase().includes(query)
            );
            this.renderExercisesList(filtered);
        }
    }
}