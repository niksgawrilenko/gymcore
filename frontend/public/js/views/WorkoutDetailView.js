// frontend/public/js/views/WorkoutDetailView.js
export default class WorkoutDetailView {
    constructor(container, api, workoutId) {
        this.container = container;
        this.api = api;
        this.workoutId = workoutId;
        this.workoutData = null;
        this.isEditing = false;
        this.render();
    }

    async render() {
        if (!this.workoutData) {
            try {
                const response = await this.api.getWorkoutDetail(this.workoutId);
                if (!response.success) throw new Error();
                
                const data = response.data;
                // НОРМАЛИЗАЦИЯ: превращаем данные из БД в понятные для инпутов
                data.exercises.forEach(ex => {
                    ex.sets.forEach(set => {
                        const isCardio = ex.exercise_type === 'cardio';
                        // Если в weight пусто, но в duration_sec есть данные — переносим
                        set.weight = isCardio ? (set.duration_sec ?? set.weight) : set.weight;
                        set.reps = isCardio ? (set.distance_m ?? set.reps) : set.reps;
                        
                        // Гарантируем, что если это 0, то это будет 0, а не null
                        if (set.weight === null) set.weight = "";
                        if (set.reps === null) set.reps = "";
                    });
                });
                
                this.workoutData = data;
            } catch (e) { /* ошибка */ }
        }

        const workout = this.workoutData;
        const dateObj = new Date(workout.workout_date);
        const formattedDate = dateObj.toLocaleDateString('ru-RU', { 
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);

        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--surface-color); padding: 12px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <a href="#" style="color: var(--accent-color); text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                        <span style="font-size: 20px;">←</span> Назад
                    </a>
                    <div style="display: flex; gap: 10px;">
                        <button id="editBtn" style="background: ${this.isEditing ? '#34c759' : 'var(--bg-color)'}; color: ${this.isEditing ? 'white' : 'var(--text-primary)'}; border: 1px solid ${this.isEditing ? '#34c759' : 'var(--border-color)'}; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">
                            ${this.isEditing ? '💾 Сохранить' : '✎ Править'}
                        </button>
                        ${this.isEditing ? `
                            <button id="cancelBtn" style="background: none; border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer;">Отмена</button>
                        ` : `
                            <button id="deleteBtn" style="background: none; border: 1px solid #ff3b30; color: #ff3b30; padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer;">🗑 Удалить</button>
                        `}
                    </div>
                </div>

                <div id="headerSection" style="background: var(--surface-color); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 20px;">
                    ${this.isEditing ? `
                        <label style="display: block; font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 5px;">Название</label>
                        <input type="text" id="editTitleInput" class="set-input" style="font-size: 18px; font-weight: bold; margin-bottom: 15px; width: 100%;" value="${workout.title}">
                        <label style="display: block; font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 5px;">Дата</label>
                        <input type="datetime-local" id="editDateInput" class="set-input" style="width: 100%;" value="${localISOTime}">
                    ` : `
                        <h2 style="margin: 0 0 5px 0; font-size: 22px;">${workout.title}</h2>
                        <div style="color: var(--text-secondary); font-size: 14px;">📅 ${formattedDate}</div>
                    `}
                </div>

                <div id="exercises-list"></div>

                ${this.isEditing ? `
                    <button id="addExBtn" class="primary-btn" style="background: var(--surface-color); color: var(--accent-color); border: 1px solid var(--accent-color); margin-top: 15px; font-weight: 600;">
                        + Добавить упражнение
                    </button>
                ` : ''}
            </section>

            <div id="exModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header"><h3>Упражнения</h3><button id="closeExModal" class="close-btn">✕</button></div>
                    <div id="modalList" style="overflow-y: auto; max-height: 60vh;"></div>
                </div>
            </div>
        `;

        this.renderExercises();
        this.bindEvents();
    }

    renderExercises() {
        const list = this.container.querySelector('#exercises-list');
        const exercises = this.workoutData.exercises;

        let groups = [];
        exercises.forEach((ex, i) => {
            if (ex.superset_id && groups.length > 0 && groups[groups.length - 1][0].superset_id === ex.superset_id) {
                groups[groups.length - 1].push({ ex, i });
            } else {
                groups.push([{ ex, i }]);
            }
        });

        list.innerHTML = groups.map(group => {
            const isSS = group.length > 1;
            const cards = group.map((item, idx) => {
                const { ex, i } = item;
                const isCardio = ex.exercise_type === 'cardio';
                
                const setsHTML = ex.sets.map((set, sIdx) => {
                    // ТЕПЕРЬ МЫ ВСЕГДА СМОТРИМ ТОЛЬКО В weight И reps
                    const val1 = (set.weight !== null && set.weight !== undefined) ? set.weight : '';
                    const val2 = (set.reps !== null && set.reps !== undefined) ? set.reps : '';

                    return this.isEditing ? `
                        <div class="set-row" data-ex-idx="${i}" data-set-idx="${sIdx}">
                            <div class="set-number">${sIdx + 1}</div>
                            <input type="number" class="set-input edit-weight" placeholder="${isCardio ? 'мин' : 'кг'}" value="${val1}">
                            <input type="number" class="set-input edit-reps" placeholder="${isCardio ? 'м' : 'раз'}" value="${val2}">
                            <button class="delete-set-btn" data-ex-idx="${i}" data-set-idx="${sIdx}" style="background:none; border:none; color:var(--text-secondary); cursor:pointer;">✕</button>
                        </div>
                    ` : `
                        <div class="set-row" style="grid-template-columns: 0.5fr 1fr 1fr 0.5fr; display: grid;">
                            <div class="set-number">${sIdx + 1}</div>
                            <div style="text-align:center; font-weight:600;">${val1 || '-'}</div>
                            <div style="text-align:center; font-weight:600;">${val2 || '-'}</div>
                            <div style="text-align:center; color:#34c759;">✓</div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="card ${isSS ? 'superset-card' : ''}" style="margin-bottom: ${isSS && idx < group.length - 1 ? '0' : '15px'}; border-radius: ${isSS ? (idx === 0 ? '16px 16px 0 0' : (idx === group.length - 1 ? '0 0 16px 16px' : '0')) : '16px'}; border-bottom: ${isSS && idx < group.length - 1 ? '1px dashed var(--border-color)' : 'none'}">
                        ${isSS && idx === 0 ? '<div style="color:var(--accent-color); font-size:12px; font-weight:bold; margin-bottom:8px;">🔗 Суперсет</div>' : ''}
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <h4 style="margin:0; font-size: 16px;">${i + 1}. ${ex.name}</h4>
                            ${this.isEditing ? `
                                <button class="delete-ex-btn" data-idx="${i}" style="background:#ff3b3015; border:none; color:#ff3b30; padding: 5px 8px; border-radius: 6px; cursor:pointer; font-size: 12px;">🗑 Удалить</button>
                            ` : ''}
                        </div>
                        <div style="display:grid; grid-template-columns: 0.5fr 1fr 1fr 0.5fr; text-align:center; font-size:11px; color:var(--text-secondary); margin-bottom:8px; font-weight:bold; text-transform: uppercase;">
                            <div>П-Д</div><div>${isCardio ? 'МИН' : 'КГ'}</div><div>${isCardio ? 'МЕТРЫ' : 'РАЗ'}</div><div></div>
                        </div>
                        ${setsHTML}
                        ${this.isEditing ? `<button class="add-set-btn" data-idx="${i}" style="margin-top:10px; width: 100%; padding: 8px; background: var(--bg-color); border: 1px dashed var(--border-color); border-radius: 8px; color: var(--text-primary); cursor:pointer;">+ Добавить подход</button>` : ''}
                    </div>
                `;
            }).join('');
            return `<div style="margin-bottom:0;">${cards}</div>`;
        }).join('');
    }

    bindEvents() {
        const deleteBtn = this.container.querySelector('#deleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm('Удалить эту тренировку из истории навсегда?')) {
                    await this.api.deleteWorkout(this.workoutId);
                    window.location.hash = '';
                }
            });
        }

        const cancelBtn = this.container.querySelector('#cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.isEditing = false;
                this.workoutData = null; 
                this.render();
            });
        }

        const editBtn = this.container.querySelector('#editBtn');
        editBtn.addEventListener('click', async () => {
            if (!this.isEditing) {
                this.isEditing = true;
                this.render();
            } else {
                const newTitle = this.container.querySelector('#editTitleInput').value;
                const newDate = this.container.querySelector('#editDateInput').value;
                
                editBtn.innerText = 'Сохранение...';
                editBtn.disabled = true;

                const updateData = {
                    title: newTitle,
                    workout_date: newDate,
                    exercises: this.workoutData.exercises
                };

                try {
                    const res = await this.api.updateWorkout(this.workoutId, updateData);
                    if (res.success) {
                        this.isEditing = false;
                        this.workoutData = null;
                        this.render();
                    }
                } catch (err) {
                    alert('Ошибка при сохранении');
                    editBtn.innerText = '💾 Сохранить';
                    editBtn.disabled = false;
                }
            }
        });

        if (this.isEditing) {
            this.container.querySelectorAll('.add-set-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = e.target.dataset.idx;
                    this.workoutData.exercises[idx].sets.push({ weight: '', reps: '', completed: true });
                    this.renderExercises();
                    this.bindEvents();
                });
            });

            this.container.querySelectorAll('.delete-set-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const { exIdx, setIdx } = e.target.dataset;
                    this.workoutData.exercises[exIdx].sets.splice(setIdx, 1);
                    this.renderExercises();
                    this.bindEvents();
                });
            });

            this.container.querySelectorAll('.edit-weight, .edit-reps').forEach(input => {
                input.addEventListener('input', (e) => {
                    const row = e.target.closest('.set-row');
                    const field = e.target.classList.contains('edit-weight') ? 'weight' : 'reps';
                    this.workoutData.exercises[row.dataset.exIdx].sets[row.dataset.setIdx][field] = e.target.value;
                });
            });

            this.container.querySelectorAll('.delete-ex-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = e.target.dataset.idx;
                    if(confirm('Удалить упражнение?')) {
                        this.workoutData.exercises.splice(idx, 1);
                        this.renderExercises();
                        this.bindEvents();
                    }
                });
            });

            const addExBtn = this.container.querySelector('#addExBtn');
            const modal = this.container.querySelector('#exModal');
            const closeExModal = this.container.querySelector('#closeExModal');

            addExBtn.addEventListener('click', async () => {
                modal.classList.add('active');
                const list = this.container.querySelector('#modalList');
                list.innerHTML = '<div style="text-align:center; padding:20px;">Загрузка...</div>';
                const res = await this.api.getExercises();
                list.innerHTML = res.data.map(ex => `
                    <div class="exercise-list-item" data-id="${ex.id}" data-name="${ex.name}" data-type="${ex.exercise_type}" style="padding: 15px; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                        <b style="font-size: 16px;">${ex.name}</b><br><small style="color: var(--text-secondary);">${ex.category}</small>
                    </div>
                `).join('');
                
                list.querySelectorAll('.exercise-list-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this.workoutData.exercises.push({
                            id: parseInt(item.dataset.id),
                            name: item.dataset.name,
                            exercise_type: item.dataset.type,
                            sets: [{ weight: '', reps: '', completed: true }]
                        });
                        modal.classList.remove('active');
                        this.renderExercises();
                        this.bindEvents();
                    });
                });
            });

            closeExModal.addEventListener('click', () => modal.classList.remove('active'));
        }
    }
}