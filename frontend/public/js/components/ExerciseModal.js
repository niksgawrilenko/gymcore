// frontend/public/js/components/ExerciseModal.js

import { escapeHTML } from '../utils/helpers.js';
import { ANATOMY, PRIMARY_GROUPS } from '../utils/constants.js';

export default class ExerciseModal {
    /**
     * @param {HTMLElement} container - Куда рендерить модалку
     * @param {Object} api - Экземпляр ApiClient
     * @param {Function} onSuccess - Коллбэк, вызываемый после успешного сохранения
     */
    constructor(container, api, onSuccess) {
        this.container = container;
        this.api = api;
        this.onSuccess = onSuccess;
        this.editingId = null;
        
        this.modalWrapper = document.createElement('div');
        this.container.appendChild(this.modalWrapper);
        
        this._onClick = this.handleClick.bind(this);
        this.render();
    }

    destroy() {
        this.modalWrapper.removeEventListener('click', this._onClick);
        this.modalWrapper.remove();
    }

    render() {
        const primaryHTML = PRIMARY_GROUPS.map(g => `
            <label><input type="checkbox" class="chip-checkbox primary-cb" value="${g}"><span class="chip-label">${g}</span></label>
        `).join('');

        const secondaryHTML = PRIMARY_GROUPS.map(group => `
            <div style="margin-bottom: 8px;">
                <div style="font-size: 11px; font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">${group}</div>
                <div class="chip-group">
                    ${ANATOMY[group].map(m => `
                        <label><input type="checkbox" class="chip-checkbox secondary-cb" value="${m}"><span class="chip-label" style="font-size: 11px;">${m}</span></label>
                    `).join('')}
                </div>
            </div>
        `).join('');

        this.modalWrapper.innerHTML = `
            <div id="sharedExFormModal" class="modal-overlay" style="z-index: 1001;">
                <div class="modal-content" style="height: auto; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3 id="sharedModalTitle">Новое упражнение</h3>
                        <button id="closeSharedExForm" class="close-btn" style="font-size: 20px; line-height: 1;">✕</button>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px;">
                        <div>
                            <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">Название</label>
                            <input type="text" id="sharedExNameInput" class="set-input" style="text-align: left;" placeholder="Например: Жим лежа">
                        </div>
                        
                        <div>
                            <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">Основные группы (можно несколько)</label>
                            <div class="chip-group">${primaryHTML}</div>
                            
                            <div style="margin-top: 10px;">
                                <label style="font-size: 11px; color: var(--text-secondary);">Свои мышцы (через запятую):</label>
                                <input type="text" id="customMusclesInput" class="set-input" style="text-align: left; margin-top: 4px;" placeholder="Например: Брахиалис, Камбаловидная">
                            </div>
                        </div>

                        <div>
                            <div id="sharedToggleAnatomyBtn" style="color: var(--accent-color); font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; margin-top: 10px;">
                                <span>▶</span> Детальная анатомия (Опционально)
                            </div>
                            <div id="sharedAnatomyContainer" class="anatomy-details" style="margin-top: 10px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                                ${secondaryHTML}
                            </div>
                        </div>

                        <div>
                            <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">Тип тренировки</label>
                            <select id="sharedExTypeInput" class="set-input" style="text-align: left; appearance: auto;">
                                <option value="strength">Силовое (Вес + Повторы)</option>
                                <option value="cardio">Кардио (Время + Расстояние)</option>
                            </select>
                        </div>
                    </div>
                    
                    <button id="sharedSaveExBtn" class="primary-btn">Сохранить</button>
                </div>
            </div>
        `;
        
        this.modalWrapper.addEventListener('click', this._onClick);
    }

    open(exercise = null) {
        this.editingId = exercise ? exercise.id : null;
        const modal = this.modalWrapper.querySelector('#sharedExFormModal');
        const title = this.modalWrapper.querySelector('#sharedModalTitle');
        const nameInput = this.modalWrapper.querySelector('#sharedExNameInput');
        const typeInput = this.modalWrapper.querySelector('#sharedExTypeInput');
        const customInput = this.modalWrapper.querySelector('#customMusclesInput');
        
        // Сброс формы
        this.modalWrapper.querySelectorAll('.chip-checkbox').forEach(cb => cb.checked = false);
        this.modalWrapper.querySelector('#sharedAnatomyContainer').classList.remove('open');
        this.modalWrapper.querySelector('#sharedToggleAnatomyBtn span').innerText = '▶';
        if (customInput) customInput.value = '';

        if (exercise) {
            title.innerText = 'Правка упражнения';
            nameInput.value = exercise.name || '';
            typeInput.value = exercise.exercise_type || 'strength';

            const exPrimary = exercise.primary_groups || (exercise.category ? [exercise.category] : []);
            const customPrimaryArray = [];

            exPrimary.forEach(muscle => {
                const cb = this.modalWrapper.querySelector(`.primary-cb[value="${muscle}"]`);
                if (cb) {
                    cb.checked = true;
                } else {
                    customPrimaryArray.push(muscle); // Это кастомная мышца!
                }
            });

            // Выводим кастомные мышцы в инпут через запятую
            if (customInput && customPrimaryArray.length > 0) {
                customInput.value = customPrimaryArray.join(', ');
            }

            if (exercise.secondary_muscles && exercise.secondary_muscles.length > 0) {
                exercise.secondary_muscles.forEach(m => {
                    const cb = this.modalWrapper.querySelector(`.secondary-cb[value="${m}"]`);
                    if (cb) cb.checked = true;
                });
                this.modalWrapper.querySelector('#sharedAnatomyContainer').classList.add('open');
                this.modalWrapper.querySelector('#sharedToggleAnatomyBtn span').innerText = '▼';
            }
        } else {
            title.innerText = 'Новое упражнение';
            nameInput.value = '';
            typeInput.value = 'strength';
        }

        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }

    close() {
        this.modalWrapper.querySelector('#sharedExFormModal').classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    async handleClick(e) {
        const t = e.target;

        if (t.id === 'closeSharedExForm' || t.id === 'sharedExFormModal') {
            this.close();
        }

        if (t.closest('#sharedToggleAnatomyBtn')) {
            const container = this.modalWrapper.querySelector('#sharedAnatomyContainer');
            const icon = this.modalWrapper.querySelector('#sharedToggleAnatomyBtn span');
            if (container.classList.contains('open')) {
                container.classList.remove('open');
                icon.innerText = '▶';
            } else {
                container.classList.add('open');
                icon.innerText = '▼';
            }
        }

        if (t.id === 'sharedSaveExBtn') {
            const name = this.modalWrapper.querySelector('#sharedExNameInput').value.trim();
            const type = this.modalWrapper.querySelector('#sharedExTypeInput').value;
            
            // 1. Собираем стандартные мышцы с чекбоксов
            const selectedPrimary = Array.from(this.modalWrapper.querySelectorAll('.primary-cb:checked')).map(cb => cb.value);
            
            // 2. Забираем текст из нового поля и разбиваем по запятым
            const customInputVal = this.modalWrapper.querySelector('#customMusclesInput').value;
            const customMuscles = customInputVal.split(',')
                .map(m => m.trim())
                .filter(m => m.length > 0); 
                
            // 3. Объединяем чекбоксы и свои мышцы в единый массив!
            const primary_groups = [...selectedPrimary, ...customMuscles];
            
            const secondary_muscles = Array.from(this.modalWrapper.querySelectorAll('.secondary-cb:checked')).map(cb => cb.value);

            if (!name) return alert('Введите название!');
            if (primary_groups.length === 0) return alert('Выберите или впишите хотя бы одну основную группу мышц!');

            const category = primary_groups[0]; 
            const btn = t;
            btn.innerText = '⏳...';
            btn.disabled = true;

            try {
                const payload = { name, category, exercise_type: type, primary_groups, secondary_muscles };
                let res;
                if (this.editingId) {
                    res = await this.api.updateExercise(this.editingId, payload);
                } else {
                    res = await this.api.createExercise(payload);
                }
                
                this.close();
                // Возвращаем результат во View (ExercisesView или WorkoutView)
                if (this.onSuccess && res.success) {
                    this.onSuccess(res.data, !!this.editingId); 
                }
            } catch (err) {
                alert('Ошибка при сохранении');
            } finally {
                btn.innerText = 'Сохранить';
                btn.disabled = false;
            }
        }
    }
}