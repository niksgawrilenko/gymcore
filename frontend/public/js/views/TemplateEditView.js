// frontend/public/js/views/TemplateEditView.js
import { escapeHTML } from '../utils/helpers.js';
import ExerciseModal from '../components/ExerciseModal.js';
import { renderExerciseCard } from '../components/ExerciseCard.js';

export default class TemplateEditView {
    constructor(container, api, templateId = null) {
        this.container = container;
        this.api = api;
        this.templateId = templateId;
        this.templateData = null;
        this.sortableInstance = null;
        this.exerciseModal = null;
        this.allExercisesCache = []; // Кэш для поиска упражнений
        
        this._onClick = this.handleClick.bind(this);
        this._onInput = this.handleInput.bind(this);
        
        this.init();
    }

    async init() {
        try {
            if (this.templateId) {
                const res = await this.api.getTemplateById(this.templateId);
                this.templateData = {
                    title: res.data.name,
                    exercises: res.data.exercises || []
                };
            } else {
                this.templateData = {
                    title: 'Новый шаблон',
                    exercises: []
                };
            }

            this.normalizeData();
            this.render();
        } catch (e) {
            this.container.innerHTML = `<div class="empty-state">Ошибка загрузки шаблона</div>`;
        }
    }

    destroy() {
        if (this.sortableInstance) this.sortableInstance.destroy();
        if (this.exerciseModal) this.exerciseModal.destroy();
        this.container.removeEventListener('click', this._onClick);
        this.container.removeEventListener('input', this._onInput);
        document.body.classList.remove('modal-open');
    }

    normalizeData() {
        let lastSSId = null;
        this.templateData.exercises.forEach(ex => {
            if ('superset_id' in ex) {
                ex.isSuperset = !!(ex.superset_id && ex.superset_id === lastSSId);
                lastSSId = ex.superset_id;
            } else {
                ex.isSuperset = !!ex.isSuperset;
            }
            if (!ex.sets) ex.sets = [{ weight: '', reps: '', completed: false }];
        });
    }

    render() {
        // ТЕПЕРЬ ТУТ КРАСИВЫЙ СТИЛЬ С КАРТОЧКАМИ КАК В ТРЕНИРОВКЕ
        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px; border: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
                    <a href="#templates" style="color: var(--accent-color); text-decoration: none; font-weight: 600;">← Назад</a>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button id="saveTemplateBtn" style="background: #34c759; color: white; border: 1px solid #34c759; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            💾 Сохранить
                        </button>
                        ${this.templateId ? `
                            <button id="deleteTemplateBtn" style="color: #ff3b30; background:none; border: 1px solid #ff3b30; padding: 8px 12px; border-radius: 8px; cursor: pointer;">🗑</button>
                        ` : ''}
                    </div>
                </div>

                <div class="card" style="margin-bottom: 20px;">
                    <input type="text" id="templateTitleInput" class="set-input" style="font-size: 18px; font-weight: bold; width: 100%; margin-bottom: 10px; text-align:left;" value="${escapeHTML(this.templateData.title)}" placeholder="Название шаблона">
                    <div style="color: var(--text-secondary); font-size: 14px;">📝 Конструктор многоразовых программ</div>
                </div>

                <div id="exercises-list"></div>
                
                <button id="addExBtn" class="primary-btn" style="margin-top: 15px; background: var(--surface-color); color: var(--accent-color); border: 1px solid var(--accent-color);">+ Добавить упражнение</button>
            </section>

            <div id="exModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Упражнения</h3>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <button id="openCreateExBtn" style="background: none; border: none; color: var(--accent-color); font-weight: bold; font-size: 28px; cursor: pointer; line-height: 1;">+</button>
                            <button id="closeModal" class="close-btn" style="font-size: 20px; line-height: 1;">✕</button>
                        </div>
                    </div>
                    <input type="text" id="modalSearchInput" class="set-input" placeholder="🔍 Поиск..." style="width: 100%; margin-bottom: 10px; text-align: left;">
                    <div id="modalList" style="overflow-y:auto; flex-grow:1;"></div>
                </div>
            </div>
        `;

        if (this.exerciseModal) this.exerciseModal.destroy();
        this.exerciseModal = new ExerciseModal(this.container, this.api, (newExercise) => {
            this.templateData.exercises.push({ ...newExercise, sets: [{ weight: '', reps: '', completed: false }] });
            this.container.querySelector('#exModal').classList.remove('active');
            this.renderExercises();
        });

        this.container.addEventListener('click', this._onClick);
        this.container.addEventListener('input', this._onInput);
        this.renderExercises();
    }

    renderExercises() {
        const list = this.container.querySelector('#exercises-list');
        const exercises = this.templateData.exercises;
        if (!exercises || exercises.length === 0) {
            list.innerHTML = '<div class="empty-state">Добавьте упражнения для шаблона</div>';
            return;
        }

        let groups = [];
        exercises.forEach((ex, i) => {
            if (ex.isSuperset && i > 0) groups[groups.length - 1].push({ ex, i });
            else groups.push([{ ex, i }]);
        });

        list.innerHTML = groups.map(group => {
            const isSS = group.length > 1;
            return `
                <div class="sortable-group" style="margin-bottom: 15px;">
                    ${group.map((item, idx) => 
                        renderExerciseCard(item, true, isSS, idx === group.length - 1, idx)
                    ).join('')}
                </div>`;
        }).join('');

        this.initSortable();
    }

    renderModalList(exercisesArray) {
        const listHTML = exercisesArray.map(ex => {
            const primary = ex.primary_groups && ex.primary_groups.length > 0 ? ex.primary_groups[0] : (ex.category || 'Без категории');
            return `
            <div class="exercise-list-item" data-id="${ex.id}" data-name="${escapeHTML(ex.name)}" data-type="${ex.exercise_type}">
                <b>${escapeHTML(ex.name)}</b><br><small style="color:var(--text-secondary);">${escapeHTML(primary)}</small>
            </div>
        `}).join('');
        this.container.querySelector('#modalList').innerHTML = listHTML || '<div style="text-align:center; padding:15px; color:var(--text-secondary);">Не найдено</div>';
    }

    async handleClick(e) {
        const t = e.target;
        const idx = t.dataset?.idx;

        if (t.id === 'saveTemplateBtn') { this.handleSave(); return; }

        if (t.id === 'deleteTemplateBtn' && confirm('Удалить этот шаблон навсегда?')) {
            await this.api.deleteTemplate(this.templateId);
            window.location.hash = '#templates';
            return;
        }

        if (t.classList?.contains('add-set-btn')) {
            this.templateData.exercises[idx].sets.push({ weight: '', reps: '', completed: false });
            this.renderExercises();
        }

        if (t.classList?.contains('menu-btn')) {
            document.querySelectorAll('.exercise-menu').forEach(m => m.classList.remove('active'));
            this.container.querySelector(`#menu-${idx}`)?.classList.add('active');
            e.stopPropagation();
        }

        if (!t.closest('.menu-btn') && !t.closest('.exercise-menu')) {
            document.querySelectorAll('.exercise-menu').forEach(m => m.classList.remove('active'));
        }

        if (t.classList?.contains('toggle-ss')) {
            this.templateData.exercises[idx].isSuperset = !this.templateData.exercises[idx].isSuperset;
            this.renderExercises();
        }

        if (t.classList?.contains('delete-ex') && confirm('Удалить упражнение из шаблона?')) {
            this.templateData.exercises.splice(idx, 1);
            this.renderExercises();
        }

        if (t.id === 'addExBtn') {
            this.container.querySelector('#exModal').classList.add('active');
            document.body.classList.add('modal-open');
            const res = await this.api.getExercises();
            if (res.success) { this.allExercisesCache = res.data; this.renderModalList(this.allExercisesCache); }
        }

        if (t.id === 'openCreateExBtn') {
            this.exerciseModal.open(); 
        }

        if (t.id === 'closeModal' || t.id === 'exModal') {
            this.container.querySelector('#exModal').classList.remove('active');
            document.body.classList.remove('modal-open');
        }

        if (t.closest('.exercise-list-item')) {
            const item = t.closest('.exercise-list-item');
            this.templateData.exercises.push({ id: parseInt(item.dataset.id), name: item.dataset.name, exercise_type: item.dataset.type, sets: [{ weight: '', reps: '', completed: false }] });
            this.container.querySelector('#exModal').classList.remove('active');
            document.body.classList.remove('modal-open');
            this.renderExercises();
        }
    }

    handleInput(e) {
        const t = e.target;
        if (t.id === 'modalSearchInput') {
            const q = t.value.toLowerCase();
            this.renderModalList(this.allExercisesCache.filter(ex => {
                const searchStr = (ex.name + ' ' + (ex.category || '')).toLowerCase();
                return searchStr.includes(q);
            }));
        }
        if (t.id === 'templateTitleInput') { this.templateData.title = t.value; return; }

        if (t.classList?.contains('edit-val')) {
            const row = t.closest('.set-row');
            this.templateData.exercises[row.dataset.exIdx].sets[row.dataset.setIdx][t.dataset.field] = t.value;
        }
    }

    async handleSave() {
        const btn = document.getElementById('saveTemplateBtn');
        btn.innerText = 'Сохранение...';
        btn.disabled = true;

        let lastSSId = null;
        const prepared = this.templateData.exercises.map((ex, i) => {
            const next = this.templateData.exercises[i + 1];
            if (!ex.isSuperset && !(next && next.isSuperset)) lastSSId = null; 
            if (!ex.isSuperset && next && next.isSuperset) lastSSId = `ss_${Date.now()}_${i}`; 
            return { ...ex, sets: ex.sets, superset_id: (ex.isSuperset || (next && next.isSuperset)) ? lastSSId : null };
        });

        try {
            let res;
            if (this.templateId) {
                res = await this.api.updateTemplate(this.templateId, { name: this.templateData.title, exercises: prepared });
            } else {
                res = await this.api.createTemplate({ name: this.templateData.title, exercises: prepared });
            }

            if (res.success) window.location.hash = '#templates';
        } catch (e) {
            alert('Ошибка при сохранении шаблона');
        } finally {
            btn.innerText = '💾 Сохранить';
            btn.disabled = false;
        }
    }

    initSortable() {
        const el = this.container.querySelector('#exercises-list');
        if (this.sortableInstance) this.sortableInstance.destroy();
        this.sortableInstance = Sortable.create(el, {
            handle: '.drag-handle', animation: 150,
            onEnd: () => {
                const els = Array.from(el.querySelectorAll('.exercise-item-data'));
                this.templateData.exercises = els.map(item => this.templateData.exercises[parseInt(item.dataset.idx)]);
                if (this.templateData.exercises[0]) this.templateData.exercises[0].isSuperset = false;
                this.renderExercises();
            }
        });
    }
}