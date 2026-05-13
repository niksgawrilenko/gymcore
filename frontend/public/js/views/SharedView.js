import { escapeHTML } from '../utils/helpers.js';

export default class SharedView {
    constructor(container, api, type, shareId) {
        this.container = container;
        this.api = api;
        this.type = type; // 'exercise' или 'template'
        this.shareId = shareId;
        this.data = null;
        this.render();
    }

    async render() {
        this.container.innerHTML = `<div class="empty-state">Загрузка данных...</div>`;
        
        try {
            const res = (this.type === 'exercise') 
                ? await this.api.getSharedExercise(this.shareId)
                : await this.api.getSharedTemplate(this.shareId);

            if (!res.success) throw new Error('Не удалось найти');
            this.data = res.data;

            this.container.innerHTML = `
                <section style="padding-bottom: 40px;">
                    <div style="margin-bottom: 20px;">
                        <a href="#" style="color: var(--accent-color); text-decoration: none;">← На главную</a>
                    </div>
                    
                    <div class="card" style="text-align: center; padding: 30px 20px;">
                        <div style="font-size: 50px; margin-bottom: 15px;">
                            ${this.type === 'exercise' ? '🏋️' : '📋'}
                        </div>
                        <h2 style="margin-bottom: 10px;">${escapeHTML(this.data.name || this.data.title)}</h2>
                        <p style="color: var(--text-secondary); margin-bottom: 25px;">
                            ${this.type === 'exercise' 
                                ? `Категория: ${this.data.category}` 
                                : (this.data.description || 'Программа тренировок')}
                        </p>
                        
                        ${this.type === 'template' && this.data.exercises ? `
                            <div style="text-align: left; background: var(--bg-color); padding: 15px; border-radius: 12px; margin-bottom: 25px;">
                                <div style="font-weight: bold; margin-bottom: 10px; font-size: 14px; color: var(--accent-color);">СОСТАВ ПРОГРАММЫ:</div>
                                ${this.data.exercises.map((ex, i) => `<div style="font-size: 14px; margin-bottom: 5px;">${i+1}. ${escapeHTML(ex.name)}</div>`).join('')}
                            </div>
                        ` : ''}

                        <button id="importBtn" class="primary-btn" style="background: var(--accent-color); color: white;">
                            📥 Добавить в мои ${this.type === 'exercise' ? 'упражнения' : 'программы'}
                        </button>
                    </div>
                </section>
            `;

            this.container.querySelector('#importBtn').onclick = () => this.handleImport();

        } catch (e) {
            this.container.innerHTML = `
                <div class="empty-state" style="color: #ff3b30;">
                    <h3>Упс! Контент не найден</h3>
                    <p>Возможно, ссылка устарела или была удалена.</p>
                    <a href="#" class="primary-btn" style="margin-top: 20px; text-decoration: none; display: inline-block;">На главную</a>
                </div>`;
        }
    }

    async handleImport() {
        const btn = this.container.querySelector('#importBtn');
        btn.innerText = 'Сохранение...';
        btn.disabled = true;

        try {
            if (this.type === 'exercise') {
                await this.api.createExercise({
                    name: this.data.name,
                    category: this.data.category,
                    exercise_type: this.data.exercise_type
                });
                alert('✅ Упражнение добавлено в ваш список!');
                window.location.hash = '#exercises';
            } else {
                // Копируем шаблон
                const exerciseIds = this.data.exercises.map(ex => ({ id: ex.id }));
                await this.api.createTemplate({
                    name: this.data.name,
                    description: this.data.description,
                    exercises: exerciseIds
                });
                alert('✅ Программа сохранена в "Мои программы"!');
                window.location.hash = '#templates';
            }
        } catch (e) {
            alert('Ошибка при импорте: ' + e.message);
            btn.innerText = 'Попробовать снова';
            btn.disabled = false;
        }
    }
}