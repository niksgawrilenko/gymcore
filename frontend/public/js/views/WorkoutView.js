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
                    exercise_type: ex.exercise_type, // <--- МЫ ЗАБЫЛИ ЭТУ СТРОЧКУ!
                    sets: [{ weight: '', reps: '', completed: false }]
                }));
                
                this.saveLocalState();
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
                    <div class="exercise-list-item" data-id="${ex.id}" data-name="${ex.name}" data-type="${ex.exercise_type}">
                        <div style="font-weight: 600;">${ex.name}</div>
                        <div style="color: var(--text-secondary); font-size: 12px;">${ex.category}</div>
                    </div>
                `).join('');

                const items = modalList.querySelectorAll('.exercise-list-item');
                items.forEach(item => {
                    item.addEventListener('click', () => {
                        this.addExerciseToWorkout({
                            id: item.dataset.id,
                            name: item.dataset.name,
                            exercise_type: item.dataset.type // <--- ПЕРЕДАЕМ ТИП!
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

        // 1. Разбиваем плоский массив на ГРУППЫ
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

        // 2. Рендерим
        container.innerHTML = htmlBlocks.map(group => {
            const isSupersetGroup = group.length > 1;

            const cardsHTML = group.map((item, idxInGroup) => {
                const ex = item.ex;
                const exIndex = item.index;
                const isCardio = ex.exercise_type === 'cardio';

                const headerHTML = isCardio 
                    ? `<div class="set-header"><div>П-Д</div><div>ВРЕМЯ (мин)</div><div>ДИСТАНЦИЯ (м)</div><div>✓</div></div>`
                    : `<div class="set-header"><div>П-Д</div><div>ВЕС (кг)</div><div>ПОВТОРЫ</div><div>✓</div></div>`;

                const setsHTML = ex.sets.map((set, setIndex) => `
                    <div class="set-row" data-ex-index="${exIndex}" data-set-index="${setIndex}">
                        <div class="set-number">${setIndex + 1}</div>
                        <input type="number" class="set-input weight-input" placeholder="${isCardio ? 'мин' : 'кг'}" value="${set.weight || ''}" ${set.completed ? 'disabled' : ''}>
                        <input type="number" class="set-input reps-input" placeholder="${isCardio ? 'метры' : 'раз'}" value="${set.reps || ''}" ${set.completed ? 'disabled' : ''}>
                        <button class="set-check ${set.completed ? 'completed' : ''}">✓</button>
                    </div>
                `).join('');

                // 🔥 ВИЗУАЛЬНАЯ МАГИЯ: Склеиваем карточки суперсета в одну!
                const cardClass = isSupersetGroup ? 'card superset-card' : 'card';
                let inlineStyle = `position: relative; `;
                
                if (isSupersetGroup) {
                    inlineStyle += `margin-bottom: 0; `; // Убираем отступ между ними
                    // Скругляем только верх самого первого и низ самого последнего
                    if (idxInGroup === 0) inlineStyle += `border-radius: 16px 16px 0 0; `;
                    else if (idxInGroup === group.length - 1) inlineStyle += `border-radius: 0 0 16px 16px; `;
                    else inlineStyle += `border-radius: 0; `;

                    // Рисуем пунктир между упражнениями
                    if (idxInGroup < group.length - 1) inlineStyle += `border-bottom: 1px dashed var(--border-color); `;
                } else {
                    inlineStyle += `margin-bottom: 15px; border-radius: 16px; `;
                }

                // Бирка Суперсета рисуется только 1 раз в самом верху группы
                const supersetBadge = (isSupersetGroup && idxInGroup === 0)
                    ? `<div style="color: var(--accent-color); font-size: 13px; font-weight: bold; margin-bottom: 10px;">🔗 Суперсет</div>`
                    : '';

                return `
                    <div class="${cardClass} exercise-item-data" data-original-index="${exIndex}" style="${inlineStyle}">
                        ${supersetBadge}

                        <h4 style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span class="drag-handle" style="cursor: grab; font-size: 24px; color: var(--text-secondary); padding: 0 5px;">≡</span>
                                <span>${exIndex + 1}. ${ex.name} <span style="font-size: 12px; color: var(--text-secondary); font-weight: normal;">${isCardio ? '🏃' : '🏋️'}</span></span>
                            </div>
                            <button class="menu-toggle-btn" data-index="${exIndex}" style="background: none; border: none; color: var(--text-secondary); font-size: 18px; cursor: pointer;">⋮</button>
                        </h4>

                        <div class="exercise-menu" id="menu-${exIndex}">
                            ${exIndex > 0 ? `
                            <button class="menu-item toggle-superset-btn" data-index="${exIndex}">
                                🔗 ${ex.isSuperset ? 'Открепить суперсет' : 'Объединить с предыдущим'}
                            </button>` : ''}
                            <button class="menu-item danger delete-exercise-btn" data-index="${exIndex}">
                                🗑️ Удалить упражнение
                            </button>
                        </div>

                        ${headerHTML}
                        <div class="sets-container">
                            ${setsHTML}
                        </div>
                        <button class="add-set-btn" data-ex-index="${exIndex}">+ Добавить подход</button>
                    </div>
                `;
            }).join('');

            // Убрали gap между карточками внутри контейнера, так как они теперь слиплись
            return `<div class="sortable-group" style="display: flex; flex-direction: column; margin-bottom: 15px;">${cardsHTML}</div>`;
        }).join('');

        this.bindSetEvents();
        this.initSortable();
    }
    // НОВЫЙ МЕТОД: Инициализация Drag & Drop (с умной сортировкой групп)
    initSortable() {
        const container = this.container.querySelector('#workout-exercises-container');
        
        if (!container || this.activeExercises.length === 0) return;

        if (typeof Sortable !== 'undefined') {
            if (this.sortableInstance) {
                this.sortableInstance.destroy();
            }

            this.sortableInstance = Sortable.create(container, {
                handle: '.drag-handle', 
                animation: 150,         
                
                onEnd: () => {
                    // Читаем НОВЫЙ порядок прямо с экрана (по DOM-элементам)
                    const newOrderEls = container.querySelectorAll('.exercise-item-data');
                    const newExercises = [];
                    
                    newOrderEls.forEach(el => {
                        const originalIndex = parseInt(el.dataset.originalIndex);
                        newExercises.push(this.activeExercises[originalIndex]);
                    });

                    // Защита от бага: самое первое упражнение на экране не может быть суперсетом
                    if (newExercises.length > 0) {
                        newExercises[0].isSuperset = false;
                    }

                    // Перезаписываем массив в памяти новым порядком
                    this.activeExercises = newExercises;
                    
                    this.saveLocalState();
                    this.renderWorkoutExercises();
                }
            });
        }
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
        // ... (после блока checkBtns.forEach) ...

        // 1. Открытие/закрытие меню "Три точки"
        const menuToggleBtns = this.container.querySelectorAll('.menu-toggle-btn');
        menuToggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                const menu = this.container.querySelector(`#menu-${index}`);
                const isActive = menu.classList.contains('active');
                
                // Закрываем все открытые меню
                this.container.querySelectorAll('.exercise-menu').forEach(m => m.classList.remove('active'));
                
                // Если оно не было активно, открываем
                if (!isActive) {
                    menu.classList.add('active');
                }
                e.stopPropagation(); // Не даем клику уйти дальше
            });
        });

        // 2. Логика объединения в Суперсет
        const toggleSupersetBtns = this.container.querySelectorAll('.toggle-superset-btn');
        toggleSupersetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                // Меняем статус суперсета на противоположный
                this.activeExercises[index].isSuperset = !this.activeExercises[index].isSuperset;
                this.saveLocalState();
                this.renderWorkoutExercises();
            });
        });

        // 3. Логика удаления упражнения
        const deleteBtns = this.container.querySelectorAll('.delete-exercise-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (confirm('Точно удалить это упражнение?')) {
                    // Вырезаем упражнение из памяти
                    this.activeExercises.splice(index, 1);
                    this.saveLocalState();
                    this.renderWorkoutExercises();
                }
            });
        });

        // 4. Закрытие меню при клике в любое пустое место на экране
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-toggle-btn') && !e.target.closest('.exercise-menu')) {
                const menus = this.container.querySelectorAll('.exercise-menu');
                if (menus) menus.forEach(m => m.classList.remove('active'));
            }
        }, { once: true }); // Вешаем только на 1 клик, чтобы не засорять память
    }
}