// frontend/public/js/views/WorkoutView.js
import { escapeHTML, getCurrentUserId } from '../utils/helpers.js';

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
                        
                        // НОВОЕ: Если выбран шаблон, подтягиваем его упражнения с сервера
                        if (templateId) {
                            try {
                                const tplData = await this.api.getTemplateById(templateId);
                                if (tplData.success && tplData.data.exercises) {
                                    // Клонируем список упражнений
                                    loadedExercises = JSON.parse(JSON.stringify(tplData.data.exercises));
                                }
                            } catch (err) {
                                console.error("Не удалось подтянуть упражнения шаблона", err);
                            }
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
        this.container.removeEventListener('click', this._onClick);
        this.container.removeEventListener('input', this._onInput);
    }

    normalizeData() {
        let lastSSId = null;
        if (!this.workoutData.exercises) this.workoutData.exercises = [];
        this.workoutData.exercises.forEach(ex => {
            ex.isSuperset = !!(ex.superset_id && ex.superset_id === lastSSId);
            lastSSId = ex.superset_id;
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

        // Узнаем, является ли пользователь владельцем этого шаблона/тренировки
        const myId = getCurrentUserId();
        const isOwner = !this.workoutId || this.workoutData.user_id === myId;

        // Если чужой шаблон, меняем текст кнопки
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
                    <div class="modal-header"><h3>Упражнения</h3><div><button id="openCreateExBtn" class="close-btn">+ Новое</button><button id="closeModal" class="close-btn">✕</button></div></div>
                    <input type="text" id="modalSearchInput" class="set-input" placeholder="🔍 Поиск..." style="width: 100%; margin-bottom: 10px; text-align: left;">
                    <div id="modalList" style="overflow-y:auto; flex-grow:1;"></div>
                </div>
            </div>

            <div id="exCreateModal" class="modal-overlay" style="z-index: 1001;">
                <div class="modal-content" style="height: auto;">
                    <div class="modal-header"><h3>Новое упражнение</h3><button id="closeCreateExModal" class="close-btn">✕</button></div>
                    <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px;">
                        <input type="text" id="newExName" class="set-input" style="text-align: left;" placeholder="Название">
                        <select id="newExCategory" class="set-input" style="text-align: left;"><option value="Грудь">Грудь</option><option value="Спина">Спина</option><option value="Ноги">Ноги</option><option value="Руки">Руки</option><option value="Плечи">Плечи</option></select>
                        <select id="newExType" class="set-input" style="text-align: left;"><option value="strength">Силовое</option><option value="cardio">Кардио</option></select>
                    </div>
                    <button id="saveNewExBtn" class="primary-btn">Создать и добавить</button>
                </div>
            </div>
        `;
        
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

        let groups = [];
        exercises.forEach((ex, i) => {
            if (ex.isSuperset && i > 0) groups[groups.length - 1].push({ ex, i });
            else groups.push([{ ex, i }]);
        });

        list.innerHTML = groups.map(group => {
            const isSS = group.length > 1;
            return `<div class="sortable-group" style="margin-bottom: 15px;">` + group.map((item, idx) => {
                const { ex, i } = item;
                const isCardio = ex.exercise_type === 'cardio';
                const setsHTML = ex.sets.map((s, sIdx) => `
                    <div class="set-row" data-ex-idx="${i}" data-set-idx="${sIdx}">
                        <div class="set-number">${sIdx + 1}</div>
                        ${this.isEditing ? `
                            <input type="number" class="set-input edit-val" data-field="weight" placeholder="${isCardio ? 'мин' : 'кг'}" value="${s.weight}">
                            <input type="number" class="set-input edit-val" data-field="reps" placeholder="${isCardio ? 'м' : 'раз'}" value="${s.reps}">
                        ` : `
                            <div style="text-align:center; font-weight:600;">${s.weight || '-'}</div>
                            <div style="text-align:center; font-weight:600;">${s.reps || '-'}</div>
                        `}
                        <button class="set-check ${s.completed ? 'completed' : ''}">✓</button>
                    </div>
                `).join('');

                return `
                    <div class="card exercise-item-data ${isSS ? 'superset-card' : ''}" data-idx="${i}" style="position: relative; margin-bottom:${isSS && idx < group.length - 1 ? '0' : '10px'}; border-radius:${isSS ? (idx === 0 ? '14px 14px 0 0' : (idx === group.length - 1 ? '0 0 14px 14px' : '0')) : '14px'};">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="margin-bottom:10px; display:flex; align-items:center; gap:8px;">
                                ${this.isEditing ? '<span class="drag-handle" style="color:var(--text-secondary); cursor:grab;">≡</span>' : ''}
                                ${i + 1}. ${escapeHTML(ex.name)}
                            </h4>
                            ${this.isEditing ? `<button class="menu-btn" data-idx="${i}" style="background:none; border:none; color:var(--text-secondary); font-size:20px; cursor:pointer;">⋮</button>` : ''}
                        </div>
                        <div class="exercise-menu" id="menu-${i}">
                            <button class="menu-item toggle-ss" data-idx="${i}">🔗 ${ex.isSuperset ? 'Открепить' : 'Суперсет'}</button>
                            <button class="menu-item danger delete-ex" data-idx="${i}">🗑 Удалить</button>
                        </div>
                        <div class="set-header"><div>П-Д</div><div>${isCardio ? 'ВРЕМЯ' : 'ВЕС'}</div><div>${isCardio ? 'МЕТРЫ' : 'ПОВТ'}</div><div></div></div>
                        ${setsHTML}
                        ${this.isEditing ? `<button class="add-set-btn" data-idx="${i}" style="width:100%; border: 1px dashed var(--border-color); background:none; padding: 8px; border-radius: 8px; cursor:pointer; margin-top:10px; font-weight:600; color:var(--text-primary);">+ Добавить подход</button>` : ''}
                    </div>
                `;
            }).join('') + `</div>`;
        }).join('');

        if (this.isEditing) this.initSortable();
    }

    renderModalList(exercisesArray) {
        const listHTML = exercisesArray.map(ex => `
            <div class="exercise-list-item" data-id="${ex.id}" data-name="${escapeHTML(ex.name)}" data-type="${ex.exercise_type}">
                <b>${escapeHTML(ex.name)}</b><br><small style="color:var(--text-secondary);">${escapeHTML(ex.category)}</small>
            </div>
        `).join('');
        this.container.querySelector('#modalList').innerHTML = listHTML || '<div style="text-align:center; padding:15px; color:var(--text-secondary);">Не найдено</div>';
    }

    async handleClick(e) {
        const t = e.target;
        const idx = t.dataset?.idx;

        if (t.closest('#saveAsTemplateBtn')) {
            const name = prompt('Название шаблона:', this.workoutData.title);
            if (!name) return;
            const uniqueEx = Array.from(new Set(this.workoutData.exercises.map(ex => ex.id))).map(id => ({id}));
            try {
                await this.api.createTemplate({ name, exercises: uniqueEx });
                alert('✅ Сохранено в шаблоны');
            } catch (e) { alert('Ошибка сохранения'); }
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
            const res = await this.api.getExercises();
            if (res.success) { this.allExercisesCache = res.data; this.renderModalList(this.allExercisesCache); }
        }

        if (t.id === 'openCreateExBtn') this.container.querySelector('#exCreateModal').classList.add('active');
        if (t.id === 'closeCreateExModal' || t.id === 'exCreateModal') this.container.querySelector('#exCreateModal').classList.remove('active');

        if (t.id === 'saveNewExBtn') {
            const name = this.container.querySelector('#newExName').value.trim();
            const category = this.container.querySelector('#newExCategory').value;
            const exercise_type = this.container.querySelector('#newExType').value;
            if (!name) return alert('Введите название!');
            try {
                const res = await this.api.createExercise({ name, category, exercise_type });
                if (res.success) {
                    this.workoutData.exercises.push({ ...res.data, sets: [{ weight: '', reps: '', completed: false }] });
                    this.container.querySelector('#exCreateModal').classList.remove('active');
                    this.container.querySelector('#exModal').classList.remove('active');
                    this.renderExercises();
                    this.saveToLocal();
                }
            } catch (e) { alert('Ошибка создания'); }
        }

        if (t.id === 'closeModal' || t.id === 'exModal') this.container.querySelector('#exModal').classList.remove('active');

        if (t.closest('.exercise-list-item')) {
            const item = t.closest('.exercise-list-item');
            this.workoutData.exercises.push({ id: parseInt(item.dataset.id), name: item.dataset.name, exercise_type: item.dataset.type, sets: [{ weight: '', reps: '', completed: false }] });
            this.container.querySelector('#exModal').classList.remove('active');
            this.renderExercises();
            this.saveToLocal();
        }
    }

    handleInput(e) {
        const t = e.target;
        if (t.id === 'modalSearchInput') {
            const q = t.value.toLowerCase();
            this.renderModalList(this.allExercisesCache.filter(ex => ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q)));
        }
        if (t.id === 'titleInput') this.workoutData.title = t.value;
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
                    // Обновляем ЛИЧНЫЙ шаблон
                    res = await this.api.updateTemplate(this.workoutId, { name: this.workoutData.title, exercises: prepared });
                } else {
                    // Копируем ГЛОБАЛЬНЫЙ шаблон к себе (или создаем новый)
                    res = await this.api.createTemplate({ name: this.workoutData.title, exercises: prepared });
                    if (this.workoutId && !isOwner) {
                        alert('🌍 Глобальный шаблон успешно скопирован в ваши личные программы!');
                    }
                }
            } else {
                if (this.workoutId && isOwner) {
                    res = await this.api.updateWorkout(this.workoutId, { title: this.workoutData.title, workout_date: new Date(this.workoutData.workout_date), exercises: prepared });
                } else {
                    res = await this.api.createWorkout({ title: this.workoutData.title, workout_date: new Date(this.workoutData.workout_date), exercises: prepared });
                }
            }

            if (res.success) {
                if (!this.isTemplateMode) localStorage.removeItem('gymcore_active_workout');
                
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