import { escapeHTML } from '../utils/helpers.js';

export default class HistoryView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        
        this.workouts = [];
        this.viewMode = 'list'; // 'list' или 'calendar'
        
        const now = new Date();
        this.currentMonth = now.getMonth();
        this.currentYear = now.getFullYear();
        this.selectedDate = new Date(); // День, на который кликнул юзер
        
        this._onClick = this.handleClick.bind(this);
        this.render();
    }

    destroy() {
        this.container.removeEventListener('click', this._onClick);
    }

    render() {
        this.container.innerHTML = `
            <section class="recent-history" style="padding-bottom: 80px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h2 class="section-title" style="margin: 0; margin-top: 5px;">История</h2>
                    <div class="view-toggle">
                        <button class="toggle-btn ${this.viewMode === 'list' ? 'active' : ''}" data-view="list">Список</button>
                        <button class="toggle-btn ${this.viewMode === 'calendar' ? 'active' : ''}" data-view="calendar">Календарь</button>
                    </div>
                </div>

                <div id="listViewContainer" style="display: ${this.viewMode === 'list' ? 'block' : 'none'};">
                    <div class="empty-state">Загрузка...</div>
                </div>

                <div id="calendarViewContainer" style="display: ${this.viewMode === 'calendar' ? 'block' : 'none'};">
                    <div class="card" style="padding: 15px 10px;">
                        <div class="calendar-header">
                            <button id="prevMonthBtn" class="icon-btn" style="padding: 5px 15px;">&lt;</button>
                            <span id="calendarMonthLabel">Месяц</span>
                            <button id="nextMonthBtn" class="icon-btn" style="padding: 5px 15px;">&gt;</button>
                        </div>
                        <div class="calendar-grid">
                            <div class="calendar-day-header">Пн</div><div class="calendar-day-header">Вт</div><div class="calendar-day-header">Ср</div>
                            <div class="calendar-day-header">Чт</div><div class="calendar-day-header">Пт</div><div class="calendar-day-header">Сб</div>
                            <div class="calendar-day-header">Вс</div>
                        </div>
                        <div id="calendarDays" class="calendar-grid"></div>
                    </div>
                    
                    <div id="selectedDayDetails" style="margin-top: 20px;"></div>
                </div>
            </section>
        `;
        
        this.container.addEventListener('click', this._onClick);
        this.loadHistory();
    }

    async loadHistory() {
        try {
            const response = await this.api.getWorkouts();
            if (response.success) {
                this.workouts = response.data.sort((a, b) => b.workout_date - a.workout_date);
            }
        } catch (error) {
            console.error(error);
        }
        
        this.renderList();
        if (this.viewMode === 'calendar') this.renderCalendar();
    }

    // Хелпер: переводит timestamp в строку формата YYYY-MM-DD для сравнения
    toDateString(timestamp) {
        const d = new Date(timestamp);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    renderList() {
        const listContainer = this.container.querySelector('#listViewContainer');
        if (this.workouts.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">Вы еще не провели ни одной тренировки</div>';
            return;
        }

        listContainer.innerHTML = this.workouts.map(workout => {
            const dateObj = new Date(workout.workout_date);
            const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `
                <a href="#workout-detail?id=${workout.id}" class="card" style="display: flex; justify-content: space-between; align-items: center; text-decoration: none; color: inherit;">
                    <div>
                        <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${escapeHTML(workout.title)}</div>
                        <div style="color: var(--text-secondary); font-size: 13px;">📅 ${formattedDate}</div>
                    </div>
                    <div style="color: var(--accent-color); font-weight: bold;">></div>
                </a>
            `;
        }).join('');
    }

    renderCalendar() {
        const monthLabel = this.container.querySelector('#calendarMonthLabel');
        const daysContainer = this.container.querySelector('#calendarDays');
        
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        monthLabel.innerText = `${monthNames[this.currentMonth]} ${this.currentYear}`;

        const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1).getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
        
        // Смещаем дни недели (чтобы Пн был 0, а Вс 6)
        let startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        let daysHTML = '';
        const todayStr = this.toDateString(Date.now());
        const selectedStr = this.toDateString(this.selectedDate);

        // Словарь: дата (YYYY-MM-DD) -> массив тренировок
        const workoutsByDate = {};
        this.workouts.forEach(w => {
            const dStr = this.toDateString(w.workout_date);
            if (!workoutsByDate[dStr]) workoutsByDate[dStr] = [];
            workoutsByDate[dStr].push(w);
        });

        // Предыдущий месяц
        for (let i = startDay - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            daysHTML += `<div class="calendar-day other-month">${d}</div>`;
        }

        // Текущий месяц
        for (let d = 1; d <= daysInMonth; d++) {
            const currentLoopDate = new Date(this.currentYear, this.currentMonth, d);
            const dateStr = this.toDateString(currentLoopDate);
            
            const isToday = dateStr === todayStr ? 'today' : '';
            const isActive = dateStr === selectedStr ? 'active' : '';
            const hasWorkout = workoutsByDate[dateStr] ? '<div class="workout-dot"></div>' : '';

            daysHTML += `
                <div class="calendar-day ${isToday} ${isActive}" data-date="${dateStr}" data-timestamp="${currentLoopDate.getTime()}">
                    ${d}
                    ${hasWorkout}
                </div>
            `;
        }

        // Следующий месяц (добиваем сетку до конца строки)
        const totalCells = startDay + daysInMonth;
        const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 1; i <= remainingCells; i++) {
            daysHTML += `<div class="calendar-day other-month">${i}</div>`;
        }

        daysContainer.innerHTML = daysHTML;
        
        // Обновляем детальную информацию под календарем
        this.renderSelectedDayDetails(workoutsByDate[selectedStr], this.selectedDate);
    }

    renderSelectedDayDetails(dayWorkouts, dateObj) {
        const detailsContainer = this.container.querySelector('#selectedDayDetails');
        const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        
        let html = `<h3 style="font-size: 16px; margin-bottom: 12px; margin-left: 5px;">${formattedDate}</h3>`;

        if (dayWorkouts && dayWorkouts.length > 0) {
            html += dayWorkouts.map(workout => `
                <a href="#workout-detail?id=${workout.id}" class="card" style="display: flex; justify-content: space-between; align-items: center; text-decoration: none; color: inherit; border-left: 4px solid #34c759;">
                    <div>
                        <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${escapeHTML(workout.title)}</div>
                        <div style="color: var(--text-secondary); font-size: 13px;">${new Date(workout.workout_date).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                    <div style="color: var(--accent-color); font-weight: bold;">></div>
                </a>
            `).join('');
        } else {
            html += `<div class="empty-state" style="padding: 15px;">В этот день тренировок не было</div>`;
        }

        // Кнопка добавления тренировки на выбранный день
        html += `
            <button class="primary-btn" id="addWorkoutForDateBtn" data-timestamp="${dateObj.getTime()}" style="margin-top: 10px; background: var(--surface-color); color: var(--accent-color); border: 2px solid var(--accent-color); box-shadow: none;">
                + Записать тренировку на этот день
            </button>
        `;

        detailsContainer.innerHTML = html;
    }

    handleClick(e) {
        const t = e.target;

        // Переключение вкладок Список/Календарь
        if (t.classList.contains('toggle-btn')) {
            this.viewMode = t.dataset.view;
            this.container.querySelector('#listViewContainer').style.display = this.viewMode === 'list' ? 'block' : 'none';
            this.container.querySelector('#calendarViewContainer').style.display = this.viewMode === 'calendar' ? 'block' : 'none';
            
            this.container.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
            t.classList.add('active');

            if (this.viewMode === 'calendar') this.renderCalendar();
        }

        // Навигация по месяцам
        if (t.id === 'prevMonthBtn') {
            this.currentMonth--;
            if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
            this.renderCalendar();
        }
        if (t.id === 'nextMonthBtn') {
            this.currentMonth++;
            if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
            this.renderCalendar();
        }

        // Клик по конкретному дню
        const dayCell = t.closest('.calendar-day');
        if (dayCell && !dayCell.classList.contains('other-month')) {
            this.selectedDate = new Date(parseInt(dayCell.dataset.timestamp));
            this.renderCalendar();
        }

        // Кнопка "+ Записать тренировку"
        if (t.id === 'addWorkoutForDateBtn') {
            const ts = t.dataset.timestamp;
            // Если у юзера уже идет активная тренировка сейчас
            if (localStorage.getItem('gymcore_active_workout')) {
                if (!confirm('У вас есть незавершенная тренировка. Если начать новую, текущая будет сброшена. Продолжить?')) return;
                localStorage.removeItem('gymcore_active_workout');
            }
            
            // Сохраняем выбранную дату в кэш и переходим в редактор
            sessionStorage.setItem('gymcore_custom_date', ts);
            window.location.hash = '#workout';
        }
    }
}