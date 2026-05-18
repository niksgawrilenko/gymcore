// frontend/public/js/views/StatsView.js
import { escapeHTML } from '../utils/helpers.js';

export default class StatsView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.workouts = [];
        this.init();
    }

    async init() {
        this.container.innerHTML = `<div class="empty-state">Сбор аналитики...</div>`;
        try {
            const res = await this.api.getWorkouts();
            if (res.success) {
                this.workouts = res.data;
            }
            this.render();
        } catch (e) {
            this.container.innerHTML = `<div class="empty-state">Ошибка загрузки статистики</div>`;
        }
    }

    destroy() {}

    calculateStats() {
        let totalVolume = 0;
        let totalSets = 0;
        let exerciseCounts = {};

        this.workouts.forEach(w => {
            if (!w.exercises) return;
            w.exercises.forEach(ex => {
                // Считаем популярность упражнений
                if (ex.name) {
                    exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + 1;
                }
                
                // Считаем подходы и тоннаж
                if (!ex.sets) return;
                ex.sets.forEach(set => {
                    if (set.completed) {
                        totalSets++;
                        const weight = parseFloat(set.weight) || 0;
                        const reps = parseInt(set.reps) || 0;
                        totalVolume += (weight * reps);
                    }
                });
            });
        });

        // Ищем самое частое упражнение
        let topExercise = 'Нет данных';
        let maxCount = 0;
        for (const [name, count] of Object.entries(exerciseCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topExercise = name;
            }
        }

        return { 
            workoutsCount: this.workouts.length, 
            totalVolume: Math.round(totalVolume), 
            totalSets, 
            topExercise 
        };
    }

    render() {
        const stats = this.calculateStats();

        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px; border: 1px solid var(--border-color);">
                    <a href="#profile" style="color: var(--accent-color); text-decoration: none; font-weight: 600;">← В профиль</a>
                    <h2 style="font-size: 16px; margin: 0;">Статистика</h2>
                    <div style="width: 60px;"></div> </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div class="card" style="padding: 20px 15px; text-align: center; margin: 0; background: linear-gradient(135deg, #0a84ff 0%, #0056b3 100%); color: white;">
                        <div style="font-size: 28px; font-weight: 800; margin-bottom: 5px;">${stats.workoutsCount}</div>
                        <div style="font-size: 13px; opacity: 0.9;">Тренировок всего</div>
                    </div>
                    <div class="card" style="padding: 20px 15px; text-align: center; margin: 0; background: linear-gradient(135deg, #34c759 0%, #248a3d 100%); color: white;">
                        <div style="font-size: 28px; font-weight: 800; margin-bottom: 5px;">${stats.totalSets}</div>
                        <div style="font-size: 13px; opacity: 0.9;">Выполнено подходов</div>
                    </div>
                </div>

                <div class="card" style="padding: 20px; margin-bottom: 15px; display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 35px;">🏋️‍♂️</div>
                    <div>
                        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 2px;">Общий поднятый вес (Объем)</div>
                        <div style="font-size: 24px; font-weight: 800;">${stats.totalVolume.toLocaleString('ru-RU')} <span style="font-size: 16px; color: var(--text-secondary);">кг</span></div>
                    </div>
                </div>

                <div class="card" style="padding: 20px; margin-bottom: 15px; display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 35px;">⭐</div>
                    <div>
                        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 2px;">Любимое упражнение</div>
                        <div style="font-size: 18px; font-weight: 700;">${escapeHTML(stats.topExercise)}</div>
                    </div>
                </div>
            </section>
        `;
    }
}