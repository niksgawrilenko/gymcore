export default class WorkoutView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        
        // 1. ПРОВЕРЯЕМ, ЕСТЬ ЛИ НЕДОДЕЛАННАЯ ТРЕНИРОВКА В ПАМЯТИ
        const savedState = localStorage.getItem('gymcore_active_workout');
        
        if (savedState) {
            // ВОССТАНАВЛИВАЕМ ИЗ ПАМЯТИ
            const parsedState = JSON.parse(savedState);
            this.workoutTitle = parsedState.workoutTitle;
            this.templateId = parsedState.templateId;
            this.activeExercises = parsedState.activeExercises;
            this.startTime = parsedState.startTime;
            console.log('Восстановлена прерванная тренировка');
        } else {
            // ЕСЛИ НЕТ - НАЧИНАЕМ НОВУЮ
            this.workoutTitle = sessionStorage.getItem('currentWorkoutTitle') || 'Свободная тренировка';
            this.templateId = sessionStorage.getItem('currentTemplateId') || null;
            this.activeExercises = []; 
            this.startTime = Date.now();
        }

        this.timerInterval = null;
        
        this.render();

        // 2. ЕСЛИ ЭТО НОВАЯ ТРЕНИРОВКА С ШАБЛОНОМ - ГРУЗИМ УПРАЖНЕНИЯ
        if (!savedState) {
            this.loadTemplateData(); 
        } else {
            // ЕСЛИ ВОССТАНОВИЛИ - ПРОСТО РИСУЕМ
            this.renderWorkoutExercises();
        }
    }

    // НОВЫЙ МЕТОД: Сохраняет всё в память телефона
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
        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 class="section-title" style="margin: 0;">${this.workoutTitle}</h2>
                    <span id="workoutTimer" style="color: var(--text-secondary); font-weight: bold;">00:00</span>
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
        // ВНИМАНИЕ: this.renderWorkoutExercises() отсюда убрали, 
        // так как теперь его вызывает loadTemplateData()
    }

    // НОВЫЙ МЕТОД: Автозагрузка упражнений из шаблона
    async loadTemplateData() {
        if (!this.templateId) {
            this.renderWorkoutExercises();
            return;
        }

        try {
            const response = await this.api.getTemplateById(this.templateId);
            if (response.success) {
                const templateExercises = response.data.exercises;
                this.activeExercises = templateExercises.map(ex => ({
                    id: ex.id,
                    name: ex.name,
                    category: ex.category,
                    sets: [{ weight: '', reps: '', completed: false }]
                }));
                
                this.saveLocalState(); // <--- СОХРАНЯЕМ СРАЗУ ПОСЛЕ ЗАГРУЗКИ ШАБЛОНА
                this.renderWorkoutExercises();
            }
        } catch (error) {
            console.error('Ошибка загрузки шаблона:', error);
            this.container.querySelector('#workout-exercises-container').innerHTML = 
                '<div class="card empty-state" style="color: red;">Ошибка загрузки шаблона</div>';
        }
    }

    // НОВЫЙ МЕТОД: Логика таймера
    startTimer() {
        const timerElement = this.container.querySelector('#workoutTimer');
        
        this.timerInterval = setInterval(() => {
            // Если мы ушли с экрана тренировки, останавливаем таймер в фоне
            if (!document.body.contains(timerElement)) {
                clearInterval(this.timerInterval);
                return;
            }

            // Считаем разницу в секундах
            const diffInSeconds = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = String(Math.floor(diffInSeconds / 60)).padStart(2, '0');
            const seconds = String(diffInSeconds % 60).padStart(2, '0');
            
            timerElement.innerText = `${minutes}:${seconds}`;
        }, 1000);
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

                finishBtn.innerText = 'Сохранение...';
                finishBtn.disabled = true;

                // ТЕПЕРЬ ПЕРЕДАЕМ ПРАВИЛЬНЫЕ ДАННЫЕ В БАЗУ
                const workoutData = {
                    title: this.workoutTitle, // <--- Подставляем имя шаблона
                    template_id: this.templateId, // <--- И его ID
                    exercises: this.activeExercises
                };

                try {
                    const response = await this.api.saveWorkout(workoutData);
                    if (response.success) {
                        clearInterval(this.timerInterval); // Останавливаем таймер
                        window.location.hash = ''; // Возвращаемся на главную
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
    addExerciseToWorkout(exercise) {
        this.activeExercises.push({
            ...exercise,
            // Сразу добавляем один пустой подход для удобства
            sets: [{ weight: '', reps: '', completed: false }] 
        });
        this.saveLocalState();
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
        const addSetBtns = this.container.querySelectorAll('.add-set-btn');
        addSetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exIndex = e.target.dataset.exIndex;
                this.activeExercises[exIndex].sets.push({ weight: '', reps: '', completed: false });
                
                this.saveLocalState(); // <--- СОХРАНЯЕМ
                this.renderWorkoutExercises();
            });
        });

        // НОВОЕ: Сохраняем вес и повторы ПРЯМО ВО ВРЕМЯ ВВОДА
        const weightInputs = this.container.querySelectorAll('.weight-input');
        const repsInputs = this.container.querySelectorAll('.reps-input');

        weightInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const row = e.target.closest('.set-row');
                this.activeExercises[row.dataset.exIndex].sets[row.dataset.setIndex].weight = e.target.value;
                this.saveLocalState(); // <--- СОХРАНЯЕМ КАЖДУЮ ЦИФРУ
            });
        });

        repsInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const row = e.target.closest('.set-row');
                this.activeExercises[row.dataset.exIndex].sets[row.dataset.setIndex].reps = e.target.value;
                this.saveLocalState(); // <--- СОХРАНЯЕМ КАЖДУЮ ЦИФРУ
            });
        });

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
                
                // Сохраняем и перерисовываем
                this.saveLocalState();
                this.renderWorkoutExercises();
            });
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

                const workoutData = {
                    title: this.workoutTitle,
                    template_id: this.templateId,
                    exercises: this.activeExercises
                };

                try {
                    const response = await this.api.saveWorkout(workoutData);
                    if (response.success) {
                        clearInterval(this.timerInterval);
                        
                        // САМОЕ ВАЖНОЕ: ТРЕНИРОВКА ОКОНЧЕНА, ОЧИЩАЕМ ПАМЯТЬ!
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
}