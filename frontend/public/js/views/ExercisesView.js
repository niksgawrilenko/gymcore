// frontend/public/js/views/ExercisesView.js
export default class ExercisesView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.exercises = [];
        this.editingId = null;
        this.render();
    }

    async render() {
        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--surface-color); padding: 12px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <a href="#" style="color: var(--accent-color); text-decoration: none; font-weight: 600;">← Назад</a>
                    <button id="openAddModalBtn" style="background: none; border: none; color: var(--accent-color); font-weight: bold; font-size: 28px; cursor: pointer; padding: 0 10px;">+</button>
                </div>
                
                <h2 style="margin-bottom: 15px; font-size: 24px;">База упражнений</h2>
                
                <input type="text" id="exSearchInput" class="set-input" placeholder="🔍 Поиск упражнения..." style="width: 100%; margin-bottom: 20px; text-align: left;">
                
                <div id="exercisesList"><div style="text-align:center; color: var(--text-secondary);">Загрузка...</div></div>
            </section>

            <div id="exFormModal" class="modal-overlay">
                <div class="modal-content" style="height: auto; max-height: 80vh;">
                    <div class="modal-header">
                        <h3 id="modalTitle">Новое упражнение</h3>
                        <button id="closeExForm" class="close-btn">✕</button>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px;">
                        <div>
                            <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 5px; display: block;">Название</label>
                            <input type="text" id="exNameInput" class="set-input" style="text-align: left;" placeholder="Например: Жим лежа">
                        </div>
                        <div>
                            <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 5px; display: block;">Мышечная группа</label>
                            <select id="exCategoryInput" class="set-input" style="text-align: left; appearance: auto; background-color: var(--bg-color);">
                                <option value="Грудь">Грудь</option>
                                <option value="Спина">Спина</option>
                                <option value="Ноги">Ноги</option>
                                <option value="Руки">Руки</option>
                                <option value="Плечи">Плечи</option>
                                <option value="Пресс">Пресс</option>
                                <option value="Кардио">Кардио</option>
                                <option value="Всё тело">Всё тело</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 5px; display: block;">Тип тренировки</label>
                            <select id="exTypeInput" class="set-input" style="text-align: left; appearance: auto; background-color: var(--bg-color);">
                                <option value="strength">Силовое (Вес + Повторы)</option>
                                <option value="cardio">Кардио (Время + Расстояние)</option>
                            </select>
                        </div>
                    </div>
                    
                    <button id="saveExBtn" class="primary-btn">Сохранить</button>
                </div>
            </div>
        `;
        
        this.bindEvents();
        await this.loadExercises();
    }

    async loadExercises() {
        const list = this.container.querySelector('#exercisesList');
        try {
            const res = await this.api.getExercises();
            this.exercises = res.data;
            this.renderExercisesList(this.exercises);
        } catch (e) {
            list.innerHTML = '<div class="empty-state" style="color: #ff3b30;">Ошибка загрузки базы данных</div>';
        }
    }

    renderExercisesList(exercisesArray) {
        const list = this.container.querySelector('#exercisesList');
        
        if (exercisesArray.length === 0) {
            list.innerHTML = '<div class="empty-state">Упражнения не найдены</div>';
            return;
        }

        const grouped = {};
        exercisesArray.forEach(ex => {
            if (!grouped[ex.category]) grouped[ex.category] = [];
            grouped[ex.category].push(ex);
        });

        list.innerHTML = Object.keys(grouped).map(category => `
            <div style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px; color: var(--text-secondary); font-size: 14px; text-transform: uppercase; padding-left: 5px;">${category}</h4>
                ${grouped[category].map(ex => `
                    <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 12px 16px;">
                        <div>
                            <div style="font-weight: 600; font-size: 16px;">${ex.name}</div>
                            <div style="color: var(--text-secondary); font-size: 12px; margin-top: 4px;">${ex.exercise_type === 'cardio' ? '🏃 Кардио' : '🏋️ Силовое'}</div>
                        </div>
                        <div style="display: flex; gap: 15px;">
                            <button class="edit-btn" data-id="${ex.id}" style="background: none; border: none; font-size: 18px; cursor: pointer; color: var(--accent-color);">✎</button>
                            <button class="delete-btn" data-id="${ex.id}" style="background: none; border: none; font-size: 18px; color: #ff3b30; cursor: pointer;">🗑</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    openModal(id = null) {
        this.editingId = id;
        const modal = this.container.querySelector('#exFormModal');
        const title = this.container.querySelector('#modalTitle');
        const nameInput = this.container.querySelector('#exNameInput');
        const catInput = this.container.querySelector('#exCategoryInput');
        const typeInput = this.container.querySelector('#exTypeInput');

        if (id) {
            const ex = this.exercises.find(e => e.id === parseInt(id));
            title.innerText = 'Правка упражнения';
            nameInput.value = ex.name;
            catInput.value = ex.category;
            typeInput.value = ex.exercise_type;
        } else {
            title.innerText = 'Новое упражнение';
            nameInput.value = '';
            catInput.value = 'Грудь';
            typeInput.value = 'strength';
        }

        modal.classList.add('active');
    }

    bindEvents() {
        // ЛОГИКА ПОИСКА (на oninput)
        this.container.addEventListener('input', (e) => {
            if (e.target.id === 'exSearchInput') {
                const query = e.target.value.toLowerCase();
                const filtered = this.exercises.filter(ex => 
                    ex.name.toLowerCase().includes(query) || 
                    ex.category.toLowerCase().includes(query)
                );
                this.renderExercisesList(filtered);
            }
        });

        this.container.onclick = async (e) => {
            const t = e.target;

            if (t.id === 'openAddModalBtn') this.openModal();
            if (t.classList.contains('edit-btn')) this.openModal(t.dataset.id);
            if (t.id === 'closeExForm' || t.classList.contains('modal-overlay')) {
                this.container.querySelector('#exFormModal').classList.remove('active');
            }

            if (t.classList.contains('delete-btn')) {
                if (confirm('Точно удалить упражнение из базы? Оно может пропасть из истории тренировок.')) {
                    await this.api.deleteExercise(t.dataset.id);
                    this.loadExercises();
                }
            }

            if (t.id === 'saveExBtn') {
                const name = this.container.querySelector('#exNameInput').value.trim();
                const category = this.container.querySelector('#exCategoryInput').value;
                const type = this.container.querySelector('#exTypeInput').value;

                if (!name) return alert('Введите название!');

                t.innerText = '⏳...';
                t.disabled = true;

                const payload = { name, category, exercise_type: type };

                try {
                    if (this.editingId) await this.api.updateExercise(this.editingId, payload);
                    else await this.api.createExercise(payload);
                    
                    this.container.querySelector('#exFormModal').classList.remove('active');
                    this.container.querySelector('#exSearchInput').value = ''; // Сбрасываем поиск
                    this.loadExercises();
                } catch (err) {
                    alert('Ошибка при сохранении');
                } finally {
                    t.innerText = 'Сохранить';
                    t.disabled = false;
                }
            }
        };
    }
}