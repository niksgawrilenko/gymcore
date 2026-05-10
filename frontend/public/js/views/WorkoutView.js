// frontend/public/js/views/WorkoutView.js
export default class WorkoutView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        
        // Состояние нашей тренировки (State)
        this.activeExercises = []; 
        
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 class="section-title" style="margin: 0;">Тренировка</h2>
                    <span style="color: var(--text-secondary); font-weight: bold;">00:00</span>
                </div>
                
                <div id="workout-exercises-container"></div>
                
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
    }

    bindEvents() {
        const addBtn = this.container.querySelector('#addExerciseBtn');
        const closeBtn = this.container.querySelector('#closeModalBtn');
        const modal = this.container.querySelector('#exerciseModal');

        // Открытие шторки
        addBtn.addEventListener('click', () => {
            modal.classList.add('active');
            this.loadExercisesIntoModal(); // Загружаем список из БД
        });

        // Закрытие шторки
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        // ... (где-то под обработчиками шторки в bindEvents)
        
        const finishBtn = this.container.querySelector('#finishWorkoutBtn');
        if(finishBtn) {
            finishBtn.addEventListener('click', async () => {
                if (this.activeExercises.length === 0) {
                    alert('Добавьте хотя бы одно упражнение!');
                    return;
                }

                // Меняем текст кнопки, чтобы показать процесс
                finishBtn.innerText = 'Сохранение...';
                finishBtn.disabled = true;

                // Собираем данные
                const workoutData = {
                    title: 'Тренировка Upper/Lower', // Пока хардкодим название
                    exercises: this.activeExercises
                };

                try {
                    // Отправляем на бэкенд
                    const response = await this.api.saveWorkout(workoutData);
                    if (response.success) {
                        // Если всё ок - возвращаем на главный экран
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

    // Метод: Идем на бэкенд за списком упражнений
    async loadExercisesIntoModal() {
        const modalList = this.container.querySelector('#modalList');
        try {
            const response = await this.api.getExercises();
            if (response.success) {
                // Рисуем список
                modalList.innerHTML = response.data.map(ex => `
                    <div class="exercise-list-item" data-id="${ex.id}" data-name="${ex.name}">
                        <div style="font-weight: 600;">${ex.name}</div>
                        <div style="color: var(--text-secondary); font-size: 12px;">${ex.category}</div>
                    </div>
                `).join('');

                // Вешаем клик на каждое упражнение в списке
                const items = modalList.querySelectorAll('.exercise-list-item');
                items.forEach(item => {
                    item.addEventListener('click', () => {
                        this.addExerciseToWorkout({
                            id: item.dataset.id,
                            name: item.dataset.name
                        });
                        this.container.querySelector('#exerciseModal').classList.remove('active');
                    });
                });
            }
        } catch (error) {
            modalList.innerHTML = '<div style="color: red; text-align: center;">Ошибка загрузки</div>';
        }
    }

    // Метод: Добавляем выбранное упражнение в текущую тренировку
    // ... (весь верхний код класса до addExerciseToWorkout остается без изменений)

    // Метод: Добавляем выбранное упражнение в текущую тренировку
    addExerciseToWorkout(exercise) {
        this.activeExercises.push({
            ...exercise,
            // Сразу добавляем один пустой подход для удобства
            sets: [{ weight: '', reps: '', completed: false }] 
        });
        
        this.renderWorkoutExercises();
    }

    // Метод: Перерисовка экрана тренировки
    renderWorkoutExercises() {
        const container = this.container.querySelector('#workout-exercises-container');
        
        if (this.activeExercises.length === 0) {
            container.innerHTML = '<div class="card empty-state">Список пуст. Добавьте упражнение.</div>';
            return;
        }

        // Выводим карточки добавленных упражнений
        container.innerHTML = this.activeExercises.map((ex, exIndex) => {
            
            // Генерируем HTML для каждого подхода внутри этого упражнения
            const setsHTML = ex.sets.map((set, setIndex) => `
                <div class="set-row" data-ex-index="${exIndex}" data-set-index="${setIndex}">
                    <div class="set-number">${setIndex + 1}</div>
                    <input type="number" class="set-input weight-input" placeholder="кг" value="${set.weight}" ${set.completed ? 'disabled' : ''}>
                    <input type="number" class="set-input reps-input" placeholder="раз" value="${set.reps}" ${set.completed ? 'disabled' : ''}>
                    <button class="set-check ${set.completed ? 'completed' : ''}">✓</button>
                </div>
            `).join('');

            return `
                <div class="card" style="margin-bottom: 15px;">
                    <h4 style="margin-bottom: 15px; display: flex; justify-content: space-between;">
                        <span>${exIndex + 1}. ${ex.name}</span>
                        <button style="background: none; border: none; color: var(--text-secondary); font-size: 18px;">⋮</button>
                    </h4>

                    <div class="set-header">
                        <div>П-Д</div>
                        <div>ВЕС (кг)</div>
                        <div>ПОВТОРЫ</div>
                        <div>✓</div>
                    </div>

                    <div class="sets-container">
                        ${setsHTML}
                    </div>

                    <button class="add-set-btn" data-ex-index="${exIndex}">+ Добавить подход</button>
                </div>
            `;
        }).join('');

        // Важно! После каждой перерисовки нужно заново повесить "слушателей" на новые кнопки
        this.bindSetEvents();
    }

    // НОВЫЙ МЕТОД: Обработка кликов внутри карточек
    bindSetEvents() {
        // 1. Обработка клика "+ Добавить подход"
        const addSetBtns = this.container.querySelectorAll('.add-set-btn');
        addSetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exIndex = e.target.dataset.exIndex;
                // Добавляем пустой подход в State и перерисовываем
                this.activeExercises[exIndex].sets.push({ weight: '', reps: '', completed: false });
                this.renderWorkoutExercises();
            });
        });

        // 2. Обработка клика по галочке "✓"
        const checkBtns = this.container.querySelectorAll('.set-check');
        checkBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('.set-row');
                const exIndex = row.dataset.exIndex;
                const setIndex = row.dataset.setIndex;

                // Считываем то, что юзер ввел в инпуты
                const weightVal = row.querySelector('.weight-input').value;
                const repsVal = row.querySelector('.reps-input').value;

                // Сохраняем значения в наш State (память)
                this.activeExercises[exIndex].sets[setIndex].weight = weightVal;
                this.activeExercises[exIndex].sets[setIndex].reps = repsVal;
                
                // Переключаем статус "Выполнено" (true/false)
                this.activeExercises[exIndex].sets[setIndex].completed = !this.activeExercises[exIndex].sets[setIndex].completed;

                // Перерисовываем UI (чтобы инпуты заблокировались, а кнопка стала зеленой)
                this.renderWorkoutExercises();
            });
        });
    }
}