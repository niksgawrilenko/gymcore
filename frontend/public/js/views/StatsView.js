// frontend/public/js/views/StatsView.js
import { escapeHTML } from '../utils/helpers.js';

export default class StatsView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.workouts = [];
        this.exercisesCache = [];
        this.charts = {}; 
        this.currentStats = null; 
        this.uniqueExercises = [];
        this.selectedProgressExercise = null; 
        this._onClick = this.handleClick.bind(this);
        this.init();
    }

    async init() {
        this.container.innerHTML = `<div class="empty-state">Сбор аналитики...</div>`;
        try {
            let workoutsRes, exercisesRes;
            try {
                workoutsRes = await this.api.getWorkouts(1, 100);
            } catch (e) { workoutsRes = { success: false, error: e }; }
            
            try {
                exercisesRes = await this.api.getExercises();
            } catch (e) { exercisesRes = { success: false, error: e }; }

            let rawWorkouts = [];
            if (workoutsRes && workoutsRes.success) {
                if (Array.isArray(workoutsRes.data)) rawWorkouts = workoutsRes.data;
                else if (workoutsRes.data && Array.isArray(workoutsRes.data.data)) rawWorkouts = workoutsRes.data.data;
                else if (workoutsRes.data && Array.isArray(workoutsRes.data.workouts)) rawWorkouts = workoutsRes.data.workouts;
            }
            
            if (rawWorkouts.length === 0) {
                this.container.innerHTML = `<div class="empty-state">У вас пока нет завершенных тренировок.<br>Сначала выполните хотя бы одну!</div>`;
                return;
            }

            this.workouts = [...rawWorkouts].sort((a, b) => new Date(a.workout_date) - new Date(b.workout_date));
            this.exercisesCache = (exercisesRes && exercisesRes.data) || [];
            
            this.currentStats = this.calculateStats();
            this.render();

            this.loadChartJS().catch(e => console.warn("Не удалось загрузить Chart.js", e));

        } catch (e) {
            console.error("Критическая ошибка статистики:", e);
            this.container.innerHTML = `<div class="empty-state" style="color: #ff3b30;"><b>Ошибка интерфейса:</b><br>${e.message}</div>`;
        }
    }

    loadChartJS() {
        return new Promise((resolve, reject) => {
            if (window.Chart) return resolve();
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    destroy() {
        Object.values(this.charts).forEach(chart => { if (chart && typeof chart.destroy === 'function') chart.destroy(); });
        this.container.removeEventListener('click', this._onClick);
    }

    calculateStats() {
        let totalSets = 0;
        const exerciseUsage = {}; 
        const muscleBalance = {}; 
        const activityByMonth = {}; 

        this.workouts.forEach((w) => {
            if (!w || !w.workout_date) return;
            
            const date = new Date(w.workout_date);
            const monthStr = date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
            activityByMonth[monthStr] = (activityByMonth[monthStr] || 0) + 1;

            let workoutExercises = w.exercises || [];
            if (typeof workoutExercises === 'string') {
                try { workoutExercises = JSON.parse(workoutExercises); } catch(e) { workoutExercises = []; }
            }

            if (Array.isArray(workoutExercises)) {
                workoutExercises.forEach(ex => {
                    if (!ex) return;
                    const exId = ex.id || ex.exercise_id;
                    const exName = ex.name || 'Неизвестно';
                    
                    if (!exerciseUsage[exName]) exerciseUsage[exName] = { count: 0, id: exId };
                    exerciseUsage[exName].count += 1;

                    const fullExData = this.exercisesCache.find(e => e.id === exId);
                    const category = fullExData?.category || fullExData?.primary_groups?.[0] || 'Другое';

                    let setsArr = ex.sets || [];
                    if (typeof setsArr === 'string') {
                        try { setsArr = JSON.parse(setsArr); } catch(e) { setsArr = []; }
                    }

                    if (Array.isArray(setsArr)) {
                        setsArr.forEach(set => {
                            if (!set) return;
                            
                            const hasValues = !!(set.weight || set.reps);
                            const isCompleted = set.completed === true || set.completed === 'true' || set.completed === 1 || hasValues;
                            
                            if (isCompleted) {
                                totalSets += 1;
                                if (!muscleBalance[category]) muscleBalance[category] = 0;
                                muscleBalance[category] += 1;
                            }
                        });
                    }
                });
            }
        });

        const allExercisesList = Object.entries(exerciseUsage)
            .sort((a, b) => b[1].count - a[1].count)
            .map(item => ({ name: item[0], count: item[1].count }));

        this.uniqueExercises = allExercisesList.map(e => e.name).sort();

        return { totalSets, allExercisesList, muscleBalance, activityByMonth };
    }

    getExerciseProgress(exerciseName) {
        const progress = {
            weight: {},
            sets: {}
        };

        this.workouts.forEach(w => {
            if (!w || !w.workout_date) return;
            const dateStr = new Date(w.workout_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            
            let wExs = w.exercises || [];
            if (typeof wExs === 'string') { try { wExs = JSON.parse(wExs); } catch(e) { wExs = []; } }
            
            if (Array.isArray(wExs)) {
                wExs.forEach(ex => {
                    if (ex && ex.name === exerciseName && ex.sets) {
                        let sets = typeof ex.sets === 'string' ? JSON.parse(ex.sets) : ex.sets;
                        
                        if (Array.isArray(sets)) {
                            let setsCountInWorkout = 0;

                            sets.forEach(set => {
                                const hasValues = !!(set.weight || set.reps);
                                const isCompleted = set.completed === true || set.completed === 'true' || set.completed === 1 || hasValues;
                                
                                if (isCompleted) {
                                    setsCountInWorkout += 1;

                                    if (set.weight) {
                                        const wVal = parseFloat(set.weight);
                                        if (!isNaN(wVal)) {
                                            if (!progress.weight[dateStr] || wVal > progress.weight[dateStr]) {
                                                progress.weight[dateStr] = wVal;
                                            }
                                        }
                                    }
                                }
                            });

                            if (setsCountInWorkout > 0) {
                                progress.sets[dateStr] = (progress.sets[dateStr] || 0) + setsCountInWorkout;
                            }
                        }
                    }
                });
            }
        });
        return progress;
    }

    render() {
        const stats = this.currentStats;

        const modalListHtml = this.uniqueExercises.map(name => `
            <div class="stats-ex-item" data-name="${escapeHTML(name)}" style="padding: 15px; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px;">${escapeHTML(name)}</span>
                <span style="color: var(--text-secondary); flex-shrink: 0; font-size: 18px; line-height: 1;">›</span>
            </div>
        `).join('');

        const allExercisesHtml = stats.allExercisesList.length > 0 ? stats.allExercisesList.map((ex, i) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: ${i === stats.allExercisesList.length - 1 ? 'none' : '1px solid var(--border-color)'};">
                <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${i+1}. ${escapeHTML(ex.name)}</div>
                <div style="font-size: 13px; color: var(--text-secondary); background: var(--bg-color); padding: 4px 8px; border-radius: 12px; flex-shrink: 0; margin-left: 10px;">
                    ${ex.count} раз
                </div>
            </div>
        `).join('') : '<div class="empty-state">Пока нет данных</div>';

        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <h2 class="section-title" style="margin-bottom: 20px;">Моя Аналитика</h2>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div class="card" style="padding: 15px; text-align: center; border: 1px solid var(--accent-color);">
                        <div style="font-size: 26px; font-weight: 800; color: var(--accent-color);">${stats.totalSets}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase;">Сделано подходов</div>
                    </div>
                    <div class="card" style="padding: 15px; text-align: center; border: 1px solid #34c759;">
                        <div style="font-size: 26px; font-weight: 800; color: #34c759;">${this.workouts.length}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase;">Тренировок всего</div>
                    </div>
                </div>

                <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 20px;">
                    <div class="stat-menu-btn" data-target="muscleModal" style="padding: 16px; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 15px;">📊 Баланс нагрузок (Мышцы)</span>
                        <span style="color: var(--text-secondary); font-weight: bold; font-size: 18px; line-height: 1;">›</span>
                    </div>
                    <div class="stat-menu-btn" data-target="activityModal" style="padding: 16px; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 15px;">📅 Тренировочная активность</span>
                        <span style="color: var(--text-secondary); font-weight: bold; font-size: 18px; line-height: 1;">›</span>
                    </div>
                    <div class="stat-menu-btn" data-target="progressModal" style="padding: 16px; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 15px;">💪 Прогресс силы в упражнении</span>
                        <span style="color: var(--text-secondary); font-weight: bold; font-size: 18px; line-height: 1;">›</span>
                    </div>
                    <div class="stat-menu-btn" data-target="topModal" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 15px;">🏆 Все упражнения (${stats.allExercisesList.length})</span>
                        <span style="color: var(--text-secondary); font-weight: bold; font-size: 18px; line-height: 1;">›</span>
                    </div>
                </div>

                <div id="muscleModal" class="modal-overlay" style="z-index: 2000;">
                    <div class="modal-content" style="max-height: 90vh; overflow-y: auto;">
                        <div class="modal-header" style="position: sticky; top: 0; background: var(--surface-color); z-index: 10; padding: 15px 0 10px 0; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;">
                            <h3 style="margin: 0; font-size: 18px;">Баланс нагрузок</h3>
                            <button class="close-modal-btn close-btn" style="font-size: 20px; line-height: 1;">✕</button>
                        </div>
                        <div style="position: relative; height: 350px; width: 100%; margin-top: 15px;">
                            <canvas id="muscleBalanceChart"></canvas>
                        </div>
                    </div>
                </div>

                <div id="activityModal" class="modal-overlay" style="z-index: 2000;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 style="margin: 0; font-size: 18px;">Активность</h3>
                            <button class="close-modal-btn close-btn" style="font-size: 20px; line-height: 1;">✕</button>
                        </div>
                        <div style="position: relative; height: 300px; width: 100%; margin-top: 15px;">
                            <canvas id="activityChart"></canvas>
                        </div>
                    </div>
                </div>

                <div id="progressModal" class="modal-overlay" style="z-index: 2000;">
                    <div class="modal-content" style="max-height: 90vh; overflow-y: auto; padding-top: 0;">
                        <div style="position: sticky; top: 0; background: var(--surface-color); z-index: 10; padding: 15px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; margin: 0 -15px 15px -15px;">
                            <h3 style="margin: 0; font-size: 18px;">Прогресс в упражнении</h3>
                            <button class="close-modal-btn" style="background: none; border: none; color: var(--text-secondary); font-size: 20px; cursor: pointer; padding: 5px;">✕</button>
                        </div>
                        <div style="margin-top: 15px;">
                            <div id="openStatsExBtn" style="width: 100%; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-color); padding: 12px 15px; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;">
                                <span id="selectedExText" style="color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 10px; font-size: 15px;">Выберите упражнение...</span>
                                <span style="flex-shrink: 0; font-size: 16px;">🔍</span>
                            </div>
                            
                            <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px; color: var(--text-primary);">📈 Максимальный вес (кг)</div>
                            <div style="position: relative; height: 220px; width: 100%; margin-bottom: 25px;">
                                <canvas id="exerciseProgressChart"></canvas>
                            </div>

                            <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px; color: var(--text-primary);">🔋 Количество подходов</div>
                            <div style="position: relative; height: 160px; width: 100%; margin-bottom: 10px;">
                                <canvas id="exerciseSetsChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="topModal" class="modal-overlay" style="z-index: 2000;">
                    <div class="modal-content" style="height: 80vh; display: flex; flex-direction: column; padding: 0;">
                        <div class="modal-header" style="padding: 15px; border-bottom: 1px solid var(--border-color);">
                            <h3 style="margin: 0; font-size: 18px;">Все упражнения</h3>
                            <button class="close-modal-btn close-btn" style="font-size: 20px; line-height: 1;">✕</button>
                        </div>
                        <div style="flex-grow: 1; overflow-y: auto; padding: 0 15px 15px 15px;">
                            ${allExercisesHtml}
                        </div>
                    </div>
                </div>

                <div id="statsExModal" class="modal-overlay" style="z-index: 2000;">
                    <div class="modal-content" style="height: 90vh; display: flex; flex-direction: column; padding: 0;">
                        <div style="padding: 15px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: flex-start; align-items: center; gap: 15px;">
                            <button class="back-to-progress-btn" style="background: none; border: none; color: var(--text-primary); font-size: 24px; cursor: pointer; padding: 0; display: flex; align-items: center;">⬅</button>
                            <h3 style="margin: 0; font-size: 18px;">Выбор упражнения</h3>
                        </div>
                        <div style="padding: 15px; border-bottom: 1px solid var(--border-color);">
                            <input type="text" id="statsExSearch" class="set-input" placeholder="Поиск упражнения..." style="width: 100%; background: var(--bg-color); color: var(--text-primary); padding: 12px 15px; border-radius: 10px; border: 1px solid var(--border-color); outline: none; box-sizing: border-box;">
                        </div>
                        <div id="statsExList" style="flex-grow: 1; overflow-y: auto; padding-bottom: 20px;">
                            ${modalListHtml}
                        </div>
                    </div>
                </div>

            </section>
        `;

        this.container.addEventListener('click', this._onClick);

        const searchInput = this.container.querySelector('#statsExSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                this.container.querySelectorAll('.stats-ex-item').forEach(el => {
                    if (el.dataset.name.toLowerCase().includes(query)) {
                        el.style.display = 'flex';
                    } else {
                        el.style.display = 'none';
                    }
                });
            });
        }
    }

    handleClick(e) {
        const t = e.target;

        const menuBtn = t.closest('.stat-menu-btn');
        if (menuBtn) {
            const targetId = menuBtn.dataset.target;
            
            if (targetId === 'progressModal' && !this.selectedProgressExercise) {
                this.container.querySelector('#statsExModal').classList.add('active');
                document.body.classList.add('modal-open');
                return;
            }

            this.container.querySelector(`#${targetId}`).classList.add('active');
            document.body.classList.add('modal-open');

            if (!window.Chart) return;
            
            if (targetId === 'muscleModal' && !this.charts.muscle) this.renderMuscleChart();
            if (targetId === 'activityModal' && !this.charts.activity) this.renderActivityChart();
            return;
        }

        if (t.closest('#openStatsExBtn')) {
            this.container.querySelector('#progressModal').classList.remove('active');
            this.container.querySelector('#statsExModal').classList.add('active');
            return;
        }

        if (t.closest('.close-search-modal') || t.id === 'statsExModal' || t.closest('.back-to-progress-btn')) {
            this.container.querySelector('#statsExModal').classList.remove('active');
            
            if (this.selectedProgressExercise) {
                this.container.querySelector('#progressModal').classList.add('active');
            } else {
                document.body.classList.remove('modal-open');
            }
            return;
        }

        if (t.closest('.close-modal-btn') || (t.classList.contains('modal-overlay') && t.id !== 'statsExModal')) {
            const modal = t.closest('.modal-overlay') || t;
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
            return;
        }

        const exItem = t.closest('.stats-ex-item');
        if (exItem) {
            const name = exItem.dataset.name;
            this.selectedProgressExercise = name;
            
            const textEl = this.container.querySelector('#selectedExText');
            textEl.innerText = name;
            textEl.style.color = 'var(--text-primary)';
            textEl.style.fontWeight = 'bold';
            
            this.container.querySelector('#statsExModal').classList.remove('active');
            this.container.querySelector('#progressModal').classList.add('active');
            document.body.classList.add('modal-open');
            
            this.renderProgressChart(name);
        }
    }

    renderMuscleChart() {
        const stats = this.currentStats;
        const ctx = document.getElementById('muscleBalanceChart');
        if (!ctx || Object.keys(stats.muscleBalance).length === 0) return;

        const originalLabels = Object.keys(stats.muscleBalance);
        const data = Object.values(stats.muscleBalance);
        
        const totalSets = data.reduce((sum, val) => sum + val, 0);
        
        const labelsWithPercent = originalLabels.map((label, index) => {
            const percentage = Math.round((data[index] / totalSets) * 100);
            return `${label}: ${percentage}%`;
        });

        const bgColors = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#5856d6', '#ff2d55', '#5ac8fa'];

        this.charts.muscle = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: { 
                labels: labelsWithPercent, 
                datasets: [{ data, backgroundColor: bgColors.slice(0, originalLabels.length), borderWidth: 0 }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { 
                        display: true,
                        position: 'bottom',
                        labels: { 
                            color: '#e0e0e0',
                            font: { size: 13, family: 'system-ui, sans-serif' },
                            padding: 15
                        } 
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` Сделано: ${context.raw} подходов`;
                            }
                        }
                    }
                } 
            }
        });
    }

    renderActivityChart() {
        const stats = this.currentStats;
        const ctx = document.getElementById('activityChart');
        if (!ctx || Object.keys(stats.activityByMonth).length === 0) return;

        this.charts.activity = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(stats.activityByMonth),
                datasets: [{ 
                    label: 'Тренировок', 
                    data: Object.values(stats.activityByMonth), 
                    backgroundColor: 'rgba(52, 199, 89, 0.6)', 
                    borderColor: '#34c759', 
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: '#888', stepSize: 1 } }, 
                    x: { grid: { display: false }, ticks: { color: '#888' } } 
                }
            }
        });
    }

    renderProgressChart(exerciseName) {
        if (!window.Chart) return alert("Графики еще загружаются...");
        
        if (this.charts.progressWeight) this.charts.progressWeight.destroy(); 
        if (this.charts.progressSets) this.charts.progressSets.destroy(); 
        
        const ctxWeight = document.getElementById('exerciseProgressChart');
        const ctxSets = document.getElementById('exerciseSetsChart');
        if (!ctxWeight || !ctxSets) return;

        const progressData = this.getExerciseProgress(exerciseName);
        
        if (Object.keys(progressData.weight).length === 0 && Object.keys(progressData.sets).length === 0) {
            return;
        }

        this.charts.progressWeight = new Chart(ctxWeight.getContext('2d'), {
            type: 'line',
            data: {
                labels: Object.keys(progressData.weight),
                datasets: [{ 
                    label: 'Макс. вес (кг)', 
                    data: Object.values(progressData.weight), 
                    borderColor: '#007aff', 
                    backgroundColor: 'rgba(0, 122, 255, 0.1)', 
                    borderWidth: 3, 
                    fill: true, 
                    tension: 0.1 
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { 
                    y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: '#888' } }, 
                    x: { grid: { display: false }, ticks: { color: '#888' } } 
                }
            }
        });

        this.charts.progressSets = new Chart(ctxSets.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(progressData.sets),
                datasets: [{ 
                    label: 'Подходов', 
                    data: Object.values(progressData.sets), 
                    backgroundColor: 'rgba(255, 149, 0, 0.6)',
                    borderColor: '#ff9500', 
                    borderWidth: 1, 
                    borderRadius: 4 
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: '#888', stepSize: 1 } }, 
                    x: { grid: { display: false }, ticks: { color: '#888' } } 
                }
            }
        });
    }
}