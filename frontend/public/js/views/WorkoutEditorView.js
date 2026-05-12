// frontend/public/js/views/WorkoutEditorView.js
export default class WorkoutEditorView {
    constructor(container, api, workoutId = null) {
        this.container = container;
        this.api = api;
        this.workoutId = workoutId;
        this.workoutData = null;
        this.isEditing = !workoutId;
        this.timerInterval = null;
        this.sortableInstance = null;
        
        this.init();
    }

    async init() {
        if (this.workoutId) {
            try {
                const res = await this.api.getWorkoutDetail(this.workoutId);
                this.workoutData = res.data;
                this.normalizeData();
            } catch (e) {
                this.container.innerHTML = `<div class="empty-state">Ошибка загрузки</div>`;
                return;
            }
        } else {
            const saved = localStorage.getItem('gymcore_active_workout');
            if (saved) {
                this.workoutData = JSON.parse(saved);
            } else {
                this.workoutData = {
                    title: sessionStorage.getItem('currentWorkoutTitle') || 'Свободная тренировка',
                    template_id: sessionStorage.getItem('currentTemplateId') || null,
                    workout_date: new Date().getTime(),
                    exercises: []
                };
            }
        }
        this.render();
        if (!this.workoutId) this.startTimer();
    }

    normalizeData() {
        let lastSSId = null;
        this.workoutData.exercises.forEach(ex => {
            ex.isSuperset = !!(ex.superset_id && ex.superset_id === lastSSId);
            lastSSId = ex.superset_id;
            ex.sets.forEach(set => {
                const isCardio = ex.exercise_type === 'cardio';
                set.weight = isCardio ? (set.duration_sec ?? set.weight ?? "") : (set.weight ?? "");
                set.reps = isCardio ? (set.distance_m ?? set.reps ?? "") : (set.reps ?? "");
                set.completed = true;
            });
        });
    }

    saveToLocal() {
        if (!this.workoutId) {
            localStorage.setItem('gymcore_active_workout', JSON.stringify(this.workoutData));
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const timerEl = document.getElementById('workoutTimer');
            if (!timerEl) return clearInterval(this.timerInterval);
            const diff = Math.floor((Date.now() - this.workoutData.workout_date) / 1000);
            const m = String(Math.floor(diff / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            timerEl.innerText = `${m}:${s}`;
        }, 1000);
    }

    render() {
        const date = new Date(this.workoutData.workout_date);
        const localISOTime = new Date(date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const formattedDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--surface-color); padding: 12px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <a href="#" style="color: var(--accent-color); text-decoration: none; font-weight: 600;">← Назад</a>
                    <div style="display: flex; gap: 10px;">
                        <button id="mainActionBtn" style="background: ${this.isEditing ? '#34c759' : 'var(--bg-color)'}; color: ${this.isEditing ? 'white' : 'var(--text-primary)'}; border: 1px solid ${this.isEditing ? '#34c759' : 'var(--border-color)'}; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            ${this.isEditing ? '💾 Сохранить' : '✎ Править'}
                        </button>
                        ${this.isEditing && this.workoutId ? `<button id="cancelBtn" style="background: none; border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">Отмена</button>` : ''}
                        ${!this.isEditing ? `<button id="deleteBtn" style="color: #ff3b30; background:none; border: 1px solid #ff3b30; padding: 8px 12px; border-radius: 8px;">🗑</button>` : ''}
                    </div>
                </div>

                <div id="headerSection" style="background: var(--surface-color); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 20px;">
                    ${this.isEditing ? `
                        <input type="text" id="titleInput" class="set-input" style="font-size: 18px; font-weight: bold; width: 100%; margin-bottom: 10px;" value="${this.workoutData.title}">
                        <input type="datetime-local" id="dateInput" class="set-input" style="width: 100%;" value="${localISOTime}">
                    ` : `
                        <h2 style="margin:0 0 5px 0;">${this.workoutData.title}</h2>
                        <div style="color: var(--text-secondary); font-size: 14px;">📅 ${formattedDate}</div>
                    `}
                    ${!this.workoutId ? `<div id="workoutTimer" style="margin-top:10px; font-weight:bold; color:var(--accent-color); font-family:monospace;">00:00</div>` : ''}
                </div>

                <div id="exercises-list"></div>

                ${this.isEditing ? `<button id="addExBtn" class="primary-btn" style="margin-top: 15px; background: var(--surface-color); color: var(--accent-color); border: 1px solid var(--accent-color);">+ Упражнение</button>` : ''}
            </section>

            <div id="exModal" class="modal-overlay"><div class="modal-content"><div class="modal-header"><h3>Упражнения</h3><button id="closeModal" class="close-btn">✕</button></div><div id="modalList" style="overflow-y:auto;"></div></div></div>
        `;

        this.renderExercises();
        this.bindEvents();
    }

    renderExercises() {
        const list = this.container.querySelector('#exercises-list');
        const exercises = this.workoutData.exercises;
        
        let groups = [];
        exercises.forEach((ex, i) => {
            if (ex.isSuperset && i > 0) groups[groups.length - 1].push({ ex, i });
            else groups.push([{ ex, i }]);
        });

        list.innerHTML = groups.map(group => {
            const isSS = group.length > 1;
            const cards = group.map((item, idx) => {
                const { ex, i } = item;
                const isCardio = ex.exercise_type === 'cardio';
                const sets = ex.sets.map((s, sIdx) => `
                    <div class="set-row" data-ex-idx="${i}" data-set-idx="${sIdx}">
                        <div class="set-number">${sIdx + 1}</div>
                        ${this.isEditing ? `
                            <input type="number" class="set-input edit-val" data-field="weight" placeholder="${isCardio ? 'мин' : 'кг'}" value="${s.weight}">
                            <input type="number" class="set-input edit-val" data-field="reps" placeholder="${isCardio ? 'м' : 'раз'}" value="${s.reps}">
                        ` : `
                            <div style="text-align:center; font-weight:600;">${s.weight !== "" ? s.weight : '-'}</div>
                            <div style="text-align:center; font-weight:600;">${s.reps !== "" ? s.reps : '-'}</div>
                        `}
                        <button class="set-check ${s.completed ? 'completed' : ''}">✓</button>
                    </div>
                `).join('');

                // ИСПРАВЛЕНИЕ: Добавлен position: relative; чтобы меню не выпадало за границы
                return `
                    <div class="card exercise-item-data ${isSS ? 'superset-card' : ''}" data-idx="${i}" style="position: relative; margin-bottom:${isSS && idx < group.length - 1 ? '0' : '15px'}; border-radius:${isSS ? (idx === 0 ? '16px 16px 0 0' : (idx === group.length - 1 ? '0 0 16px 16px' : '0')) : '16px'};">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="margin-bottom:10px; display:flex; align-items:center; gap:8px;">
                                ${this.isEditing ? '<span class="drag-handle" style="color:var(--text-secondary); cursor:grab;">≡</span>' : ''}
                                ${ex.name}
                            </h4>
                            ${this.isEditing ? `<button class="menu-btn" data-idx="${i}" style="background:none; border:none; color:var(--text-secondary); font-size:20px; font-weight:bold; cursor:pointer; padding: 0 5px; margin-top:-10px;">⋮</button>` : ''}
                        </div>
                        <div class="exercise-menu" id="menu-${i}">
                            <button class="menu-item toggle-ss" data-idx="${i}">🔗 ${ex.isSuperset ? 'Открепить' : 'Суперсет'}</button>
                            <button class="menu-item danger delete-ex" data-idx="${i}">🗑 Удалить</button>
                        </div>
                        <div class="set-header"><div>П-Д</div><div>${isCardio ? 'ВРЕМЯ' : 'ВЕС'}</div><div>${isCardio ? 'МЕТРЫ' : 'ПОВТ'}</div><div></div></div>
                        ${sets}
                        ${this.isEditing ? `<button class="add-set-btn" data-idx="${i}" style="width:100%; border: 1px dashed var(--border-color); background:none; color:var(--text-primary); padding: 8px; border-radius: 8px; cursor:pointer; margin-top:10px; font-weight:600;">+ Добавить подход</button>` : ''}
                    </div>
                `;
            }).join('');
            return `<div class="sortable-group">${cards}</div>`;
        }).join('');

        if (this.isEditing) this.initSortable();
    }

    bindEvents() {
        this.container.onclick = async (e) => {
            const t = e.target;
            const idx = t.dataset.idx;

            if (t.id === 'mainActionBtn') {
                if (!this.isEditing) { this.isEditing = true; this.render(); }
                else this.handleSave();
            }
            if (t.id === 'cancelBtn') { this.isEditing = false; this.workoutData = null; this.init(); }
            if (t.id === 'deleteBtn' && confirm('Удалить тренировку?')) { await this.api.deleteWorkout(this.workoutId); window.location.hash = ''; }
            
            if (t.classList.contains('add-set-btn')) { this.workoutData.exercises[idx].sets.push({ weight: '', reps: '', completed: false }); this.renderExercises(); this.saveToLocal(); }
            
            if (t.classList.contains('set-check')) {
                const row = t.closest('.set-row');
                const set = this.workoutData.exercises[row.dataset.exIdx].sets[row.dataset.setIdx];
                set.completed = !set.completed;
                t.classList.toggle('completed');
                this.saveToLocal();
            }

            // Логика меню (Три точки)
            if (t.classList.contains('menu-btn')) {
                document.querySelectorAll('.exercise-menu').forEach(m => m.classList.remove('active'));
                this.container.querySelector(`#menu-${idx}`).classList.add('active');
                e.stopPropagation(); // Останавливаем клик, чтобы меню сразу не закрылось
            }

            // ИСПРАВЛЕНИЕ: Скрытие меню при клике в любое другое место
            if (!t.closest('.menu-btn') && !t.closest('.exercise-menu')) {
                document.querySelectorAll('.exercise-menu').forEach(m => m.classList.remove('active'));
            }

            if (t.classList.contains('toggle-ss')) { this.workoutData.exercises[idx].isSuperset = !this.workoutData.exercises[idx].isSuperset; this.renderExercises(); this.saveToLocal(); }
            if (t.classList.contains('delete-ex') && confirm('Удалить упражнение?')) { this.workoutData.exercises.splice(idx, 1); this.renderExercises(); this.saveToLocal(); }
            
            // Модалка
            if (t.id === 'addExBtn') {
                const modal = this.container.querySelector('#exModal');
                modal.classList.add('active');
                const res = await this.api.getExercises();
                this.container.querySelector('#modalList').innerHTML = res.data.map(ex => `
                    <div class="exercise-list-item" data-id="${ex.id}" data-name="${ex.name}" data-type="${ex.exercise_type}">
                        <b>${ex.name}</b><br><small>${ex.category}</small>
                    </div>
                `).join('');
            }
            if (t.id === 'closeModal' || t.classList.contains('modal-overlay')) this.container.querySelector('#exModal').classList.remove('active');
            if (t.closest('.exercise-list-item')) {
                const item = t.closest('.exercise-list-item');
                this.workoutData.exercises.push({ id: parseInt(item.dataset.id), name: item.dataset.name, exercise_type: item.dataset.type, sets: [{ weight: '', reps: '', completed: false }] });
                this.container.querySelector('#exModal').classList.remove('active');
                this.renderExercises();
                this.saveToLocal();
            }
        };

        this.container.oninput = (e) => {
            const t = e.target;
            if (t.id === 'titleInput') this.workoutData.title = t.value;
            if (t.id === 'dateInput') this.workoutData.workout_date = new Date(t.value).getTime();
            if (t.classList.contains('edit-val')) {
                const row = t.closest('.set-row');
                this.workoutData.exercises[row.dataset.exIdx].sets[row.dataset.setIdx][t.dataset.field] = t.value;
            }
            this.saveToLocal();
        };
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

        const payload = { title: this.workoutData.title, workout_date: new Date(this.workoutData.workout_date), exercises: prepared };

        try {
            const res = this.workoutId ? await this.api.updateWorkout(this.workoutId, payload) : await this.api.createWorkout(payload);
            if (res.success) {
                localStorage.removeItem('gymcore_active_workout');
                if (this.workoutId) { this.isEditing = false; this.render(); }
                else window.location.hash = '';
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