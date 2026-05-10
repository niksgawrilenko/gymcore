// frontend/public/js/views/WorkoutView.js
export default class WorkoutView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        
        const savedState = localStorage.getItem('gymcore_active_workout');
        
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            this.workoutTitle = parsedState.workoutTitle;
            this.templateId = parsedState.templateId;
            this.activeExercises = parsedState.activeExercises;
            this.startTime = parsedState.startTime; // Это также служит датой тренировки
        } else {
            this.workoutTitle = sessionStorage.getItem('currentWorkoutTitle') || 'Свободная тренировка';
            this.templateId = sessionStorage.getItem('currentTemplateId') || null;
            this.activeExercises = []; 
            this.startTime = Date.now();
        }

        this.timerInterval = null;
        this.render();

        if (!savedState) {
            this.loadTemplateData(); 
        } else {
            this.renderWorkoutExercises();
        }
    }

    saveLocalState() {
        const state = {
            workoutTitle: this.workoutTitle,
            templateId: this.templateId,
            activeExercises: this.activeExercises,
            startTime: this.startTime
        };
        localStorage.setItem('gymcore_active_workout', JSON.stringify(state));
    }

    render() {
        // Форматируем дату для input datetime-local
        const date = new Date(this.startTime);
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, 16);

        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div style="margin-bottom: 20px;">
                    <input type="text" id="workoutTitleInput" 
                        style="font-size: 24px; font-weight: bold; width: 100%; background: none; border: none; border-bottom: 1px solid var(--border-color); color: var(--text-primary); padding: 5px 0; outline: none; margin-bottom: 10px;" 
                        value="${this.workoutTitle}" placeholder="Название тренировки">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <input type="datetime-local" id="workoutDateInput" 
                            style="background: var(--surface-color); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 5px 10px; font-size: 14px; outline: none;" 
                            value="${localISOTime}">
                        <span id="workoutTimer" style="color: var(--text-secondary); font-weight: bold; font-family: monospace; font-size: 18px;">00:00</span>
                    </div>
                </div>
                
                <div id="workout-exercises-container">
                    <div style="text-align: center; color: var(--text-secondary); padding: 20px;">Загрузка упражнений...</div>
                </div>
                
                <button id="addExerciseBtn" class="primary-btn" style="margin-top: 20px; background-color: var(--surface-color); color: var(--accent-color); border: 1px solid var(--accent-color);">
                    + Добавить упражнение
                </button>

                <button id="finishWorkoutBtn" class="primary-btn" style="margin-top: 15px; background-color: #34c759;">
                    Завершить тренировку
                </button>
            </section>

            <div id="exerciseModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Выбор упражнения</h3>
                        <button id="closeModalBtn" class="close-btn">Отменить</button>
                    </div>
                    <div id="modalList" style="overflow-y: auto; flex-grow: 1;">
                        <div style="text-align: center; margin-top: 20px;">Загрузка...</div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.startTimer(); 
    }

    async loadTemplateData() {
        if (!this.templateId) {
            this.renderWorkoutExercises();
            return;
        }
        try {
            const response = await this.api.getTemplateById(this.templateId);
            if (response.success) {
                this.activeExercises = response.data.exercises.map(ex => ({
                    id: ex.id,
                    name: ex.name,
                    category: ex.category,
                    exercise_type: ex.exercise_type,
                    sets: [{ weight: '', reps: '', completed: false }]
                }));
                this.saveLocalState();
                this.renderWorkoutExercises();
            }
        } catch (error) {
            console.error('Ошибка загрузки шаблона:', error);
        }
    }

    startTimer() {
        const timerElement = this.container.querySelector('#workoutTimer');
        this.timerInterval = setInterval(() => {
            if (!document.body.contains(timerElement)) {
                clearInterval(this.timerInterval);
                return;
            }
            const diffInSeconds = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = String(Math.floor(Math.max(0, diffInSeconds) / 60)).padStart(2, '0');
            const seconds = String(Math.floor(Math.max(0, diffInSeconds) % 60)).padStart(2, '0');
            timerElement.innerText = `${minutes}:${seconds}`;
        }, 1000);
    }
    
    bindEvents() {
        const addBtn = this.container.querySelector('#addExerciseBtn');
        const closeBtn = this.container.querySelector('#closeModalBtn');
        const modal = this.container.querySelector('#exerciseModal');
        const titleInput = this.container.querySelector('#workoutTitleInput');
        const dateInput = this.container.querySelector('#workoutDateInput');

        // Живое редактирование заголовка
        titleInput.addEventListener('input', (e) => {
            this.workoutTitle = e.target.value;
            this.saveLocalState();
        });

        // Изменение даты тренировки
        dateInput.addEventListener('change', (e) => {
            this.startTime = new Date(e.target.value).getTime();
            this.saveLocalState();
        });

        addBtn.addEventListener('click', () => {
            modal.classList.add('active');
            this.loadExercisesIntoModal();
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        const finishBtn = this.container.querySelector('#finishWorkoutBtn');
        if(finishBtn) {
            finishBtn.addEventListener('click', async () => {
                if (this.activeExercises.length === 0) {
                    alert('Добавьте хотя бы одно упражнение!');
                    return;
                }

                finishBtn.innerText = 'Сохранение...';
                finishBtn.disabled = true;

                // Подготовка суперсетов
                let currentSupersetId = null;
                const preparedExercises = this.activeExercises.map((ex, index) => {
                    const nextEx = this.activeExercises[index + 1];
                    if (nextEx && nextEx.isSuperset) {
                        if (!currentSupersetId) currentSupersetId = `ss_${Date.now()}_${index}`;
                    } else if (!ex.isSuperset) {
                        currentSupersetId = null;
                    }
                    const finalId = ex.isSuperset || (nextEx && nextEx.isSuperset) ? currentSupersetId : null;
                    if (ex.isSuperset && (!nextEx || !nextEx.isSuperset)) currentSupersetId = null;

                    return { ...ex, superset_id: finalId };
                });

                const workoutData = {
                    title: this.workoutTitle,
                    template_id: this.templateId,
                    workout_date: new Date(this.startTime), // Отправляем выбранную дату
                    exercises: preparedExercises
                };

                try {
                    const response = await this.api.saveWorkout(workoutData);
                    if (response.success) {
                        clearInterval(this.timerInterval);
                        localStorage.removeItem('gymcore_active_workout'); 
                        window.location.hash = ''; 
                    } else {
                        alert('Ошибка сохранения: ' + response.error);
                    }
                } catch (error) {
                    alert('Ошибка сети!');
                } finally {
                    finishBtn.innerText = 'Завершить тренировку';
                    finishBtn.disabled = false;
                }
            });
        }
    }

    async loadExercisesIntoModal() {
        const modalList = this.container.querySelector('#modalList');
        const modal = this.container.querySelector('#exerciseModal'); // Добавили определение модалки здесь

        try {
            const response = await this.api.getExercises();
            if (response.success) {
                modalList.innerHTML = response.data.map(ex => `
                    <div class="exercise-list-item" data-id="${ex.id}" data-name="${ex.name}" data-type="${ex.exercise_type}">
                        <div style="font-weight: 600;">${ex.name}</div>
                        <div style="color: var(--text-secondary); font-size: 12px;">${ex.category}</div>
                    </div>
                `).join('');

                modalList.querySelectorAll('.exercise-list-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this.addExerciseToWorkout({
                            id: item.dataset.id,
                            name: item.dataset.name,
                            exercise_type: item.dataset.type
                        });
                        // Теперь переменная modal определена, и шторка скроется
                        modal.classList.remove('active');
                    });
                });
            }
        } catch (error) {
            modalList.innerHTML = '<div style="text-align: center; padding: 20px;">Ошибка загрузки упражнений</div>';
        }
    }

    addExerciseToWorkout(exercise) {
        this.activeExercises.push({
            ...exercise,
            sets: [{ weight: '', reps: '', completed: false }] 
        });
        this.saveLocalState();
        this.renderWorkoutExercises();
    }

    renderWorkoutExercises() {
        const container = this.container.querySelector('#workout-exercises-container');
        if (this.activeExercises.length === 0) {
            container.innerHTML = '<div class="card empty-state">Список пуст. Добавьте упражнение.</div>';
            return;
        }

        let htmlBlocks = [];
        let currentGroup = [];
        this.activeExercises.forEach((ex, exIndex) => {
            if (ex.isSuperset && exIndex > 0) {
                currentGroup.push({ ex, index: exIndex });
            } else {
                if (currentGroup.length > 0) htmlBlocks.push(currentGroup);
                currentGroup = [{ ex, index: exIndex }];
            }
        });
        if (currentGroup.length > 0) htmlBlocks.push(currentGroup);

        container.innerHTML = htmlBlocks.map(group => {
            const isSupersetGroup = group.length > 1;
            const cardsHTML = group.map((item, idxInGroup) => {
                const ex = item.ex;
                const exIndex = item.index;
                const isCardio = ex.exercise_type === 'cardio';
                const headerHTML = isCardio 
                    ? `<div class="set-header"><div>П-Д</div><div>ВРЕМЯ</div><div>МЕТРЫ</div><div>✓</div></div>`
                    : `<div class="set-header"><div>П-Д</div><div>ВЕС</div><div>ПОВТОРЫ</div><div>✓</div></div>`;

                const setsHTML = ex.sets.map((set, setIndex) => `
                    <div class="set-row" data-ex-index="${exIndex}" data-set-index="${setIndex}">
                        <div class="set-number">${setIndex + 1}</div>
                        <input type="number" class="set-input weight-input" placeholder="${isCardio ? 'мин' : 'кг'}" value="${set.weight || ''}">
                        <input type="number" class="set-input reps-input" placeholder="${isCardio ? 'м' : 'раз'}" value="${set.reps || ''}">
                        <button class="set-check ${set.completed ? 'completed' : ''}">✓</button>
                    </div>
                `).join('');

                const cardClass = isSupersetGroup ? 'card superset-card' : 'card';
                let style = `position: relative; `;
                if (isSupersetGroup) {
                    style += `margin-bottom: 0; `;
                    if (idxInGroup === 0) style += `border-radius: 16px 16px 0 0; `;
                    else if (idxInGroup === group.length - 1) style += `border-radius: 0 0 16px 16px; `;
                    else style += `border-radius: 0; `;
                    if (idxInGroup < group.length - 1) style += `border-bottom: 1px dashed var(--border-color); `;
                } else {
                    style += `margin-bottom: 15px; border-radius: 16px; `;
                }

                return `
                    <div class="${cardClass} exercise-item-data" data-original-index="${exIndex}" style="${style}">
                        ${(isSupersetGroup && idxInGroup === 0) ? `<div style="color: var(--accent-color); font-size: 13px; font-weight: bold; margin-bottom: 10px;">🔗 Суперсет</div>` : ''}
                        <h4 style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span class="drag-handle" style="cursor: grab; font-size: 24px; color: var(--text-secondary); padding: 0 5px;">≡</span>
                                <span>${exIndex + 1}. ${ex.name} ${isCardio ? '🏃' : '🏋️'}</span>
                            </div>
                            <button class="menu-toggle-btn" data-index="${exIndex}" style="background: none; border: none; color: var(--text-secondary); font-size: 18px; cursor: pointer;">⋮</button>
                        </h4>
                        <div class="exercise-menu" id="menu-${exIndex}">
                            ${exIndex > 0 ? `<button class="menu-item toggle-superset-btn" data-index="${exIndex}">🔗 ${ex.isSuperset ? 'Открепить' : 'Суперсет'}</button>` : ''}
                            <button class="menu-item danger delete-exercise-btn" data-index="${exIndex}">🗑 Удалить</button>
                        </div>
                        ${headerHTML}
                        <div class="sets-container">${setsHTML}</div>
                        <button class="add-set-btn" data-ex-index="${exIndex}">+ Подход</button>
                    </div>
                `;
            }).join('');
            return `<div class="sortable-group" style="display: flex; flex-direction: column; margin-bottom: 15px;">${cardsHTML}</div>`;
        }).join('');

        this.bindSetEvents();
        this.initSortable();
    }

    initSortable() {
        const container = this.container.querySelector('#workout-exercises-container');
        if (!container || this.activeExercises.length === 0 || typeof Sortable === 'undefined') return;
        if (this.sortableInstance) this.sortableInstance.destroy();

        this.sortableInstance = Sortable.create(container, {
            handle: '.drag-handle', animation: 150,
            onEnd: () => {
                const newOrderEls = container.querySelectorAll('.exercise-item-data');
                this.activeExercises = Array.from(newOrderEls).map(el => this.activeExercises[parseInt(el.dataset.originalIndex)]);
                if (this.activeExercises.length > 0) this.activeExercises[0].isSuperset = false;
                this.saveLocalState();
                this.renderWorkoutExercises();
            }
        });
    }

    bindSetEvents() {
        this.container.querySelectorAll('.add-set-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeExercises[e.target.dataset.exIndex].sets.push({ weight: '', reps: '', completed: false });
                this.saveLocalState();
                this.renderWorkoutExercises();
            });
        });

        ['weight-input', 'reps-input'].forEach(cls => {
            this.container.querySelectorAll(`.${cls}`).forEach(input => {
                input.addEventListener('input', (e) => {
                    const row = e.target.closest('.set-row');
                    const field = cls.split('-')[0];
                    this.activeExercises[row.dataset.exIndex].sets[row.dataset.setIndex][field] = e.target.value;
                    this.saveLocalState();
                });
            });
        });

        this.container.querySelectorAll('.set-check').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('.set-row');
                const set = this.activeExercises[row.dataset.exIndex].sets[row.dataset.setIndex];
                set.completed = !set.completed;
                this.saveLocalState();
                this.renderWorkoutExercises();
            });
        });

        this.container.querySelectorAll('.menu-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const menu = this.container.querySelector(`#menu-${e.target.dataset.index}`);
                const wasActive = menu.classList.contains('active');
                this.container.querySelectorAll('.exercise-menu').forEach(m => m.classList.remove('active'));
                if (!wasActive) menu.classList.add('active');
                e.stopPropagation();
            });
        });

        this.container.querySelectorAll('.toggle-superset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ex = this.activeExercises[parseInt(e.target.dataset.index)];
                ex.isSuperset = !ex.isSuperset;
                this.saveLocalState();
                this.renderWorkoutExercises();
            });
        });

        this.container.querySelectorAll('.delete-exercise-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Удалить упражнение?')) {
                    this.activeExercises.splice(parseInt(e.target.dataset.index), 1);
                    this.saveLocalState();
                    this.renderWorkoutExercises();
                }
            });
        });

        document.addEventListener('click', () => {
            this.container.querySelectorAll('.exercise-menu').forEach(m => m.classList.remove('active'));
        }, { once: true });
    }
}