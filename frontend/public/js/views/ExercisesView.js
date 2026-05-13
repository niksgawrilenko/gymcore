// frontend/public/js/views/ExercisesView.js

import { escapeHTML, getCurrentUserId } from '../utils/helpers.js';

// --- НАШ АНАТОМИЧЕСКИЙ СЛОВАРЬ ---
const ANATOMY = {
    "Грудь": ["Большая грудная", "Малая грудная", "Передняя зубчатая"],
    "Спина": ["Широчайшие", "Трапеции", "Ромбовидные", "Поясница", "Круглая"],
    "Плечи": ["Передняя дельта", "Средняя дельта", "Задняя дельта", "Ротаторная манжета"],
    "Руки": ["Бицепс", "Трицепс", "Брахиалис", "Предплечья"],
    "Ноги": ["Квадрицепс", "Бицепс бедра", "Ягодичные", "Икроножные", "Камбаловидная", "Приводящие", "Отводящие"],
    "Пресс и Кор": ["Прямая мышца (Кубики)", "Косые мышцы", "Поперечная мышца"],
    "Кардио": ["Сердечно-сосудистая", "Всё тело (Берпи/Кроссфит)"]
};
const PRIMARY_GROUPS = Object.keys(ANATOMY);

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
        document.body.classList.remove('modal-open'); // Страховка: убираем заморозку при уходе со страницы
    }

    async render() {
        const primaryHTML = PRIMARY_GROUPS.map(g => `
            <label>
                <input type="checkbox" class="chip-checkbox primary-cb" value="${g}">
                <span class="chip-label">${g}</span>
            </label>
        `).join('');

        const secondaryHTML = PRIMARY_GROUPS.map(group => `
            <div style="margin-bottom: 8px;">
                <div style="font-size: 11px; font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">${group}</div>
                <div class="chip-group">
                    ${ANATOMY[group].map(m => `
                        <label>
                            <input type="checkbox" class="chip-checkbox secondary-cb" value="${m}">
                            <span class="chip-label" style="font-size: 11px;">${m}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');

        this.container.innerHTML = `
            <style>
                .chip-group { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; }
                .chip-checkbox { display: none; }
                .chip-label { 
                    display: inline-block; padding: 6px 12px; background: var(--surface-color); 
                    border: 1px solid var(--border-color); border-radius: 16px; 
                    font-size: 13px; cursor: pointer; color: var(--text-secondary); 
                    transition: 0.2s; user-select: none;
                }
                .chip-checkbox:checked + .chip-label { 
                    background: var(--accent-color); color: white; border-color: var(--accent-color); 
                }
                .anatomy-details {
                    max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;
                }
                .anatomy-details.open {
                    max-height: 1000px;
                }
            </style>

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
                <div class="modal-content" style="height: auto; max-height: 90vh; overflow-y: auto;">
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
                            <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; display: block;">Основные группы (можно несколько)</label>
                            <div class="chip-group" id="primaryGroupsContainer">
                                ${primaryHTML}
                            </div>
                        </div>

                        <div>
                            <div id="toggleAnatomyBtn" style="color: var(--accent-color); font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; margin-top: 10px;">
                                <span>▶</span> Детальная анатомия (Опционально)
                            </div>
                            <div id="anatomyContainer" class="anatomy-details" style="margin-top: 10px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                                ${secondaryHTML}
                            </div>
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
        
        // ВОТ ЭТИ ДВЕ СТРОЧКИ ЖИЗНЕННО ВАЖНЫ (Без них клики не работают)
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
                                <div style="display: flex; gap: 10px; align-items: center; margin-left: 10px;">
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

    openModal(id = null) {
        this.editingId = id;
        const modal = this.container.querySelector('#exFormModal');
        const title = this.container.querySelector('#modalTitle');
        const nameInput = this.container.querySelector('#exNameInput');
        const typeInput = this.container.querySelector('#exTypeInput');
        
        this.container.querySelectorAll('.chip-checkbox').forEach(cb => cb.checked = false);
        this.container.querySelector('#anatomyContainer').classList.remove('open');
        this.container.querySelector('#toggleAnatomyBtn span').innerText = '▶';

        if (id) {
            const ex = this.exercises.find(e => e.id === parseInt(id));
            title.innerText = 'Правка упражнения';
            nameInput.value = ex.name;
            typeInput.value = ex.exercise_type;

            const pGroups = ex.primary_groups || (ex.category ? [ex.category] : []);
            pGroups.forEach(g => {
                const cb = this.container.querySelector(`.primary-cb[value="${g}"]`);
                if (cb) cb.checked = true;
            });

            if (ex.secondary_muscles) {
                ex.secondary_muscles.forEach(m => {
                    const cb = this.container.querySelector(`.secondary-cb[value="${m}"]`);
                    if (cb) cb.checked = true;
                });
                if (ex.secondary_muscles.length > 0) {
                    this.container.querySelector('#anatomyContainer').classList.add('open');
                    this.container.querySelector('#toggleAnatomyBtn span').innerText = '▼';
                }
            }
        } else {
            title.innerText = 'Новое упражнение';
            nameInput.value = '';
            typeInput.value = 'strength';
        }

        modal.classList.add('active');
        document.body.classList.add('modal-open'); // Включаем заморозку фона!
    }

    async handleClick(e) {
        const t = e.target;

        if (t.closest('#openAddModalBtn')) this.openModal();
        
        const editBtn = t.closest('.edit-btn');
        if (editBtn) this.openModal(editBtn.dataset.id);
        
        if (t.closest('#closeExForm') || t.id === 'exFormModal') {
            this.container.querySelector('#exFormModal').classList.remove('active');
            document.body.classList.remove('modal-open'); // Выключаем заморозку
        }

        if (t.closest('#toggleAnatomyBtn')) {
            const container = this.container.querySelector('#anatomyContainer');
            const icon = this.container.querySelector('#toggleAnatomyBtn span');
            if (container.classList.contains('open')) {
                container.classList.remove('open');
                icon.innerText = '▶';
            } else {
                container.classList.add('open');
                icon.innerText = '▼';
            }
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
            const type = this.container.querySelector('#exTypeInput').value;

            const primary_groups = Array.from(this.container.querySelectorAll('.primary-cb:checked')).map(cb => cb.value);
            const secondary_muscles = Array.from(this.container.querySelectorAll('.secondary-cb:checked')).map(cb => cb.value);

            if (!name) return alert('Введите название!');
            if (primary_groups.length === 0) return alert('Выберите хотя бы одну основную группу мышц!');

            const category = primary_groups[0]; 

            const btn = this.container.querySelector('#saveExBtn');
            btn.innerText = '⏳...';
            btn.disabled = true;

            try {
                const payload = { name, category, exercise_type: type, primary_groups, secondary_muscles };
                
                if (this.editingId) await this.api.updateExercise(this.editingId, payload);
                else await this.api.createExercise(payload);
                
                this.container.querySelector('#exFormModal').classList.remove('active');
                document.body.classList.remove('modal-open'); // Выключаем заморозку при успехе
                this.container.querySelector('#exSearchInput').value = ''; 
                this.loadExercises();
            } catch (err) {
                alert('Ошибка при сохранении');
            } finally {
                btn.innerText = 'Сохранить';
                btn.disabled = false;
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