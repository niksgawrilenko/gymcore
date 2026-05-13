// frontend/public/js/views/WorkoutView.js
import { escapeHTML, getCurrentUserId } from '../utils/helpers.js';
import ExerciseModal from '../components/ExerciseModal.js';
import { renderExerciseCard } from '../components/ExerciseCard.js';

export default class WorkoutView {
    constructor(container, api, workoutId = null, isTemplateMode = false) {
        this.container = container;
        this.api = api;
        this.workoutId = workoutId;
        this.isTemplateMode = isTemplateMode; 
        this.workoutData = null;
        this.isEditing = !workoutId || isTemplateMode;
        this.timerInterval = null;
        this.sortableInstance = null;
        this.allExercisesCache = []; 
        this.exerciseModal = null; // Инстанс модалки
        
        this._onClick = this.handleClick.bind(this);
        this._onInput = this.handleInput.bind(this);
        
        this.init();
    }

    async init() {
        try {
            if (this.workoutId) {
                const res = this.isTemplateMode 
                    ? await this.api.getTemplateById(this.workoutId) 
                    : await this.api.getWorkoutDetail(this.workoutId);
                this.workoutData = res.data;
                if (this.isTemplateMode && this.workoutData.name) this.workoutData.title = this.workoutData.name;
            } else {
                if (this.isTemplateMode) {
                    this.workoutData = { title: 'Новый шаблон', exercises: [] };
                } else {
                    const saved = localStorage.getItem('gymcore_active_workout');
                    if (saved) {
                        this.workoutData = JSON.parse(saved);
                    } else {
                        const templateId = sessionStorage.getItem('currentTemplateId');
                        let loadedExercises = [];
                        
                        if (templateId) {
                            try {
                                const tplData = await this.api.getTemplateById(templateId);
                                if (tplData.success && tplData.data.exercises) {
                                    loadedExercises = JSON.parse(JSON.stringify(tplData.data.exercises));
                                }
                            } catch (err) { console.error("Ошибка загрузки шаблона", err); }
                        }

                        this.workoutData = {
                            title: sessionStorage.getItem('currentWorkoutTitle') || 'Свободная тренировка',
                            template_id: templateId || null,
                            workout_date: new Date().getTime(),
                            exercises: loadedExercises
                        };
                    }
                }
            }
            this.normalizeData();
            this.render();
            if (!this.workoutId && !this.isTemplateMode) this.startTimer();
        } catch (e) {
            this.container.innerHTML = `<div class="empty-state">Ошибка загрузки данных</div>`;
        }
    }

    destroy() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.sortableInstance) this.sortableInstance.destroy();
        if (this.exerciseModal) this.exerciseModal.destroy();
        this.container.removeEventListener('click', this._onClick);
        this.container.removeEventListener('input', this._onInput);
        document.body.classList.remove('modal-open');
    }

    normalizeData() {
        let lastSSId = null;
        if (!this.workoutData.exercises) this.workoutData.exercises = [];
        
        this.workoutData.exercises.forEach(ex => {
            if ('superset_id' in ex) {
                ex.isSuperset = !!(ex.superset_id && ex.superset_id === lastSSId);
                lastSSId = ex.superset_id;
            } else {
                ex.isSuperset = !!ex.isSuperset;
            }
            
            if (!ex.sets) ex.sets = [{ weight: '', reps: '', completed: false }];
        });
    }

    saveToLocal() {
        if (!this.workoutId && !this.isTemplateMode) {
            localStorage.setItem('gymcore_active_workout', JSON.stringify(this.workoutData));
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const timerEl = document.getElementById('workoutTimer');
            if (!timerEl) return;
            const diff = Math.floor((Date.now() - this.workoutData.workout_date) / 1000);
            const m = String(Math.floor(diff / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            timerEl.innerText = `${m}:${s}`;
        }, 1000);
    }

    render() {
        const date = new Date(this.workoutData.workout_date || Date.now());
        const localISOTime = new Date(date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const formattedDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

        const myId = getCurrentUserId();
        const isOwner = !this.workoutId || this.workoutData.user_id === myId;
        const saveBtnText = this.isEditing ? (isOwner ? '💾 Сохранить' : '💾 Сохранить к себе') : '✎ Править';

        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px; border: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
                    <a href="#" style="color: var(--accent-color); text-decoration: none; font-weight: 600;">← Назад</a>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${!this.isEditing && this.workoutId && !this.isTemplateMode ? `
                            <button id="saveAsTemplateBtn" style="background: none; border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                                📑 В шаблон
                            </button>` : ''}
                        
                        <button id="mainActionBtn" style="background: ${this.isEditing ? '#34c759' : 'var(--bg-color)'}; color: ${this.isEditing ? 'white' : 'var(--text-primary)'}; border: 1px solid ${this.isEditing ? '#34c759' : 'var(--border-color)'}; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            ${saveBtnText}
                        </button>
                        
                        ${(!this.isEditing || this.isTemplateMode) && isOwner && this.workoutId ? `
                            <button id="deleteBtn" style="color: #ff3b30; background:none; border: 1px solid #ff3b30; padding: 8px 12px; border-radius: 8px; cursor: pointer;">🗑</button>
                        ` : ''}
                    </div>
                </div>

                <div class="card" style="margin-bottom: 20px;">
                    ${this.isEditing ? `
                        <input type="text" id="titleInput" class="set-input" style="font-size: 18px; font-weight: bold; width: 100%; margin-bottom: 10px; text-align:left;" value="${escapeHTML(this.workoutData.title)}">
                        ${!this.isTemplateMode ? `<input type="datetime-local" id="dateInput" class="set-input" style="width: 100%; text-align:left;" value="${localISOTime}">` : ''}
                    ` : `
                        <h2 style="margin:0 0 5px 0;">${escapeHTML(this.workoutData.title)}</h2>
                        ${!this.isTemplateMode ? `<div style="color: var(--text-secondary); font-size: 14px;">📅 ${formattedDate}</div>` : ''}
                    `}
                    ${(!this.workoutId && !this.isTemplateMode) ? `<div id="workoutTimer" style="margin-top:10px; font-weight:bold; color:var(--accent-color); font-family:monospace;">00:00</div>` : ''}
                </div>
                <div id="exercises-list"></div>
                ${this.isEditing ? `<button id="addExBtn" class="primary-btn" style="margin-top: 15px; background: var(--surface-color); color: var(--accent-color); border: 1px solid var(--accent-color);">+ Добавить упражнение</button>` : ''}
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
        
        // Инициализация компонента для СОЗДАНИЯ нового упражнения
        if (this.exerciseModal) this.exerciseModal.destroy();
        this.exerciseModal = new ExerciseModal(this.container, this.api, (newExercise) => {
            // Коллбэк вызывается, когда юзер успешно создал упражнение в базе
            this.workoutData.exercises.push({ ...newExercise, sets: [{ weight: '', reps: '', completed: false }] });
            this.container.querySelector('#exModal').classList.remove('active'); // Закрываем фоновую модалку выбора
            this.renderExercises();
            this.saveToLocal();
        });

        this.container.addEventListener('click', this._onClick);
        this.container.addEventListener('input', this._onInput);
        this.renderExercises();
    }

    renderExercises() {
        const list = this.container.querySelector('#exercises-list');
        const exercises = this.workoutData.exercises;
        if (!exercises || exercises.length === 0) {
            list.innerHTML = '<div class="empty-state">Упражнений пока нет</div>';
            return;
        }

        // 1. Группируем упражнения для суперсетов
        let groups = [];
        exercises.forEach((ex, i) => {
            if (ex.isSuperset && i > 0) groups[groups.length - 1].push({ ex, i });
            else groups.push([{ ex, i }]);
        });

        // 2. Рендерим группы с помощью нашего нового компонента
        list.innerHTML = groups.map(group => {
            const isSS = group.length > 1;
            return `
                <div class="sortable-group" style="margin-bottom: 15px;">
                    ${group.map((item, idx) => 
                        renderExerciseCard(item, this.isEditing, isSS, idx === group.length - 1, idx)
                    ).join('')}
                </div>`;
        }).join('');

        if (this.isEditing) this.initSortable();
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

        if (t.closest('#saveAsTemplateBtn')) {
            const name = prompt('Название шаблона:', this.workoutData.title);
            if (!name) return;

            let lastSSId = null;
            const preparedForTemplate = this.workoutData.exercises.map((ex, i) => {
                const next = this.workoutData.exercises[i + 1];
                if (next && next.isSuperset) { 
                    if (!lastSSId) lastSSId = `ss_tpl_${Date.now()}_${i}`; 
                } else if (!ex.isSuperset) {
                    lastSSId = null;
                }
                return { 
                    id: ex.id, 
                    superset_id: (ex.isSuperset || (next && next.isSuperset)) ? lastSSId : null,
                    sets: ex.sets // <----- ВОТ ЭТО ВЕРНЕТ СЕТЫ В ШАБЛОН!
                };
            });

            try {
                await this.api.createTemplate({ 
                    name, 
                    exercises: preparedForTemplate 
                });
                alert('✅ Шаблон создан со всеми связями и подходами!');
            } catch (e) { 
                alert('Ошибка сохранения шаблона'); 
            }
        }
        if (t.id === 'mainActionBtn') {
            if (!this.isEditing) { this.isEditing = true; this.render(); }
            else this.handleSave();
        }

        if (t.id === 'deleteBtn' && confirm('Удалить?')) {
            const action = this.isTemplateMode ? this.api.deleteTemplate(this.workoutId) : this.api.deleteWorkout(this.workoutId);
            await action; window.location.hash = this.isTemplateMode ? '#templates' : '';
        }

        if (t.classList?.contains('add-set-btn')) {
            this.workoutData.exercises[idx].sets.push({ weight: '', reps: '', completed: false });
            this.renderExercises();
            this.saveToLocal();
        }

        if (t.classList?.contains('set-check')) {
            const row = t.closest('.set-row');
            const set = this.workoutData.exercises[row.dataset.exIdx].sets[row.dataset.setIdx];
            set.completed = !set.completed;
            t.classList.toggle('completed');
            this.saveToLocal();
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
            this.workoutData.exercises[idx].isSuperset = !this.workoutData.exercises[idx].isSuperset;
            this.renderExercises();
            this.saveToLocal();
        }

        if (t.classList?.contains('delete-ex') && confirm('Удалить упражнение?')) {
            this.workoutData.exercises.splice(idx, 1);
            this.renderExercises();
            this.saveToLocal();
        }

        if (t.id === 'addExBtn') {
            this.container.querySelector('#exModal').classList.add('active');
            document.body.classList.add('modal-open');
            const res = await this.api.getExercises();
            if (res.success) { this.allExercisesCache = res.data; this.renderModalList(this.allExercisesCache); }
        }

        // --- ВОТ ТУТ МАГИЯ ВЫЗОВА КОМПОНЕНТА ---
        if (t.id === 'openCreateExBtn') {
            this.exerciseModal.open(); // Открываем нашу новенькую модалку!
        }

        if (t.id === 'closeModal' || t.id === 'exModal') {
            this.container.querySelector('#exModal').classList.remove('active');
            document.body.classList.remove('modal-open');
        }

        if (t.closest('.exercise-list-item')) {
            const item = t.closest('.exercise-list-item');
            this.workoutData.exercises.push({ id: parseInt(item.dataset.id), name: item.dataset.name, exercise_type: item.dataset.type, sets: [{ weight: '', reps: '', completed: false }] });
            this.container.querySelector('#exModal').classList.remove('active');
            document.body.classList.remove('modal-open');
            this.renderExercises();
            this.saveToLocal();
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
        if (t.id === 'titleInput') this.workoutData.title = t.value;
        
        if (t.id === 'dateInput') this.workoutData.workout_date = new Date(t.value).getTime();

        if (t.classList?.contains('edit-val')) {
            const row = t.closest('.set-row');
            this.workoutData.exercises[row.dataset.exIdx].sets[row.dataset.setIdx][t.dataset.field] = t.value;
        }
        this.saveToLocal();
    }

    async handleSave() {
        const btn = document.getElementById('mainActionBtn');
        btn.innerText = 'Загрузка...';
        btn.disabled = true;
        
        let lastSSId = null;
        const prepared = this.workoutData.exercises.map((ex, i) => {
            const next = this.workoutData.exercises[i + 1];
            if (next && next.isSuperset) { if (!lastSSId) lastSSId = `ss_${Date.now()}_${i}`; }
            else if (!ex.isSuperset) lastSSId = null;
            return { ...ex, superset_id: (ex.isSuperset || (next && next.isSuperset)) ? lastSSId : null };
        });

        const myId = getCurrentUserId();
        const isOwner = !this.workoutId || this.workoutData.user_id === myId;

        try {
            let res;
            if (this.isTemplateMode) {
                if (this.workoutId && isOwner) {
                    res = await this.api.updateTemplate(this.workoutId, { name: this.workoutData.title, exercises: prepared });
                } else {
                    res = await this.api.createTemplate({ name: this.workoutData.title, exercises: prepared });
                    if (this.workoutId && !isOwner) alert('🌍 Глобальный шаблон успешно скопирован в ваши личные программы!');
                }
            } else {
                if (this.workoutId && isOwner) {
                    res = await this.api.updateWorkout(this.workoutId, { title: this.workoutData.title, workout_date: new Date(this.workoutData.workout_date), exercises: prepared });
                } else {
                    res = await this.api.createWorkout({ title: this.workoutData.title, workout_date: new Date(this.workoutData.workout_date), exercises: prepared });
                }
            }

            if (res.success) {
                if (!this.isTemplateMode) {
                    localStorage.removeItem('gymcore_active_workout');
                }
                
                if (this.workoutId && isOwner && !this.isTemplateMode) { 
                    this.isEditing = false; 
                    this.render(); 
                }
                else window.location.hash = this.isTemplateMode ? '#templates' : '';
            }
        } catch (e) { alert('Ошибка сохранения'); }
        finally { btn.innerText = 'Сохранить'; btn.disabled = false; }
    }

    initSortable() {
        const el = this.container.querySelector('#exercises-list');
        if (this.sortableInstance) this.sortableInstance.destroy();
        this.sortableInstance = Sortable.create(el, {
            handle: '.drag-handle', animation: 150,
            onEnd: () => {
                const els = Array.from(el.querySelectorAll('.exercise-item-data'));
                this.workoutData.exercises = els.map(item => this.workoutData.exercises[parseInt(item.dataset.idx)]);
                if (this.workoutData.exercises[0]) this.workoutData.exercises[0].isSuperset = false;
                this.renderExercises();
                this.saveToLocal();
            }
        });
    }
}