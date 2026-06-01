// frontend/public/js/views/ActiveWorkoutView.js
import { escapeHTML, getCurrentUserId } from '../utils/helpers.js';
import ExerciseModal from '../components/ExerciseModal.js';
import { renderExerciseCard } from '../components/ExerciseCard.js';

export default class ActiveWorkoutView {
    constructor(container, api, workoutId = null) {
        this.container = container;
        this.api = api;
        this.workoutId = workoutId;
        this.workoutData = null;
        this.isEditing = !workoutId; // Если ID нет - это режим записи/редактирования
        this.timerInterval = null;
        this.sortableInstance = null;
        this.allExercisesCache = []; 
        this.exerciseModal = null;
        
        this._onClick = this.handleClick.bind(this);
        this._onInput = this.handleInput.bind(this);
        
        this.init();
    }

    async init() {
        try {
            // 1. Делаем медиа глобальным, чтобы файлы не умирали при переключении вкладок
            this.pendingMedia = window.gymcorePendingMedia || [];
            window.gymcorePendingMedia = this.pendingMedia;

            if (this.workoutId) {
                // Просмотр/редактирование существующей тренировки из истории
                const res = await this.api.getWorkoutDetail(this.workoutId);
                this.workoutData = res.data;
                this.workoutData.media = this.workoutData.media || [];
                
                const myId = getCurrentUserId();
                const isOwner = this.workoutData.user_id === myId;
                // Редактировать можно только свои тренировки
                this.isEditing = false; 
            } else {
                // ИЩЕМ СОХРАНЕННЫЙ ЧЕРНОВИК В КЭШЕ
                const savedActive = localStorage.getItem('gymcore_active_workout');
                
                if (savedActive) {
                    this.workoutData = JSON.parse(savedActive);
                } else {
                    // Создаем новую пустую тренировку или по шаблону
                    const templateId = sessionStorage.getItem('currentTemplateId');
                    let loadedExercises = [];
                    
                    if (templateId) {
                        try {
                            const tplData = await this.api.getTemplateById(templateId);
                            if (tplData.success && tplData.data.exercises) {
                                loadedExercises = JSON.parse(JSON.stringify(tplData.data.exercises));
                            }
                        } catch (err) { console.error("Ошибка загрузки шаблона", err); }
                    }

                    const customDate = sessionStorage.getItem('gymcore_custom_date');
                    const workoutDate = customDate ? parseInt(customDate) : new Date().getTime();
                    sessionStorage.removeItem('gymcore_custom_date');

                    this.workoutData = {
                        title: sessionStorage.getItem('currentWorkoutTitle') || 'Свободная тренировка',
                        template_id: templateId || null,
                        workout_date: workoutDate,
                        exercises: loadedExercises,
                        media: []
                    };
                }
            }
            if (!this.workoutData.media) this.workoutData.media = [];
            this.historyMap = {};
            if (this.isEditing && !this.workoutId) {
                try {
                    const histRes = await this.api.getHistoryMap();
                    if (histRes.success) this.historyMap = histRes.data;
                } catch (err) { console.warn("Не удалось загрузить историю"); }
            }
            if (!this.workoutData.media) this.workoutData.media = [];
            this.normalizeData();
            if (!this.workoutId) this.saveToLocal();
            this.render();
            if (!this.workoutId) this.startTimer();
        } catch (e) {
            this.container.innerHTML = `<div class="empty-state">Ошибка загрузки данных</div>`;
        }
    }

    destroy() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.sortableInstance) this.sortableInstance.destroy();
        if (this.exerciseModal) this.exerciseModal.destroy();
        this.container.removeEventListener('click', this._onClick);
        this.container.removeEventListener('input', this._onInput);
        document.body.classList.remove('modal-open');
    }

    normalizeData() {
        let lastSSId = null;
        if (!this.workoutData.exercises) this.workoutData.exercises = [];
        
        this.workoutData.exercises.forEach(ex => {
            if ('superset_id' in ex) {
                ex.isSuperset = !!(ex.superset_id && ex.superset_id === lastSSId);
                lastSSId = ex.superset_id;
            } else {
                ex.isSuperset = !!ex.isSuperset;
            }
            if (!ex.sets) ex.sets = [{ weight: '', reps: '', completed: false }];
        });
    }

    saveToLocal() {
        if (!this.workoutId) {
            localStorage.setItem('gymcore_active_workout', JSON.stringify(this.workoutData));
            // Триггерим обновление глобального мини-плеера
            const bottomNav = document.getElementById('bottomNav');
            if (bottomNav && window.location.hash !== '#workout') {
                window.location.reload(); 
            }
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const timerEl = document.getElementById('workoutTimer');
            if (!timerEl) return;
            const diff = Math.floor((Date.now() - this.workoutData.workout_date) / 1000);
            const m = String(Math.floor(diff / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            timerEl.innerText = `${m}:${s}`;
        }, 1000);
    }

    render() {
        const date = new Date(this.workoutData.workout_date || Date.now());
        const localISOTime = new Date(date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const formattedDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

        const myId = getCurrentUserId();
        const isOwner = !this.workoutId || this.workoutData.user_id === myId;
        const saveBtnText = this.isEditing ? '💾 Сохранить' : '✎ Править';

        this.container.innerHTML = `
            <section style="padding-bottom: 80px;">
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px; border: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
                    <a href="#" style="color: var(--accent-color); text-decoration: none; font-weight: 600;">← Назад</a>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${!this.isEditing && this.workoutId ? `
                            <button id="saveAsTemplateBtn" style="background: none; border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                                📑 В шаблон
                            </button>` : ''}
                        ${!this.workoutId ? `
                            <button id="cancelWorkoutBtn" style="color: #ff3b30; background: none; border: 1px solid #ff3b30; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                                ❌ Отменить
                            </button>
                        ` : ''}
                        
                        <button id="mainActionBtn" style="background: ${this.isEditing ? '#34c759' : 'var(--bg-color)'}; color: ${this.isEditing ? 'white' : 'var(--text-primary)'}; border: 1px solid ${this.isEditing ? '#34c759' : 'var(--border-color)'}; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            ${saveBtnText}
                        </button>
                        
                        ${!this.isEditing && isOwner && this.workoutId ? `
                            <button id="deleteBtn" style="color: #ff3b30; background:none; border: 1px solid #ff3b30; padding: 8px 12px; border-radius: 8px; cursor: pointer;">🗑</button>
                        ` : ''}
                    </div>
                </div>

                <div class="card" style="margin-bottom: 20px;">
                    ${this.isEditing ? `
                        <input type="text" id="titleInput" class="set-input" style="font-size: 18px; font-weight: bold; width: 100%; margin-bottom: 10px; text-align:left;" value="${escapeHTML(this.workoutData.title)}">
                        <input type="datetime-local" id="dateInput" class="set-input" style="width: 100%; text-align:left;" value="${localISOTime}">
                    ` : `
                        <h2 style="margin:0 0 5px 0;">${escapeHTML(this.workoutData.title)}</h2>
                        <div style="color: var(--text-secondary); font-size: 14px;">📅 ${formattedDate}</div>
                    `}
                    ${!this.workoutId ? `<div id="workoutTimer" style="margin-top:10px; font-weight:bold; color:var(--accent-color); font-family:monospace;">00:00</div>` : ''}
                </div>
                <div id="exercises-list"></div>
                ${this.isEditing ? `<button id="addExBtn" class="primary-btn" style="margin-top: 15px; background: var(--surface-color); color: var(--accent-color); border: 1px solid var(--accent-color);">+ Добавить упражнение</button>` : ''}
                
                <div class="card media-upload-section" style="margin-top: 20px; padding: 15px;">
                    <h4 style="margin-bottom: 10px; font-size: 15px;">Медиафайлы тренировки</h4>
                    <div id="mediaPreviewContainer" style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;"></div>

                    ${this.isEditing ? `
                        <input type="file" id="workoutFileInput" accept="image/*,video/*" style="display: none;">
                        <button id="triggerUploadBtn" class="primary-btn" style="width: 100%; border: 1px dashed var(--accent-color); background: none; color: var(--accent-color); box-shadow: none; font-size: 14px; padding: 12px;">
                            📸 Добавить фото или видео
                        </button>
                    ` : ''}
                </div>
            </section>

            <div id="exModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Упражнения</h3>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <button id="openCreateExBtn" style="background: none; border: none; color: var(--accent-color); font-weight: bold; font-size: 28px; cursor: pointer; line-height: 1;">+</button>
                            <button id="closeModal" class="close-btn" style="font-size: 20px; line-height: 1;">✕</button>
                        </div>
                    </div>
                    <input type="text" id="modalSearchInput" class="set-input" placeholder="🔍 Поиск..." style="width: 100%; margin-bottom: 10px; text-align: left;">
                    <div id="modalList" style="overflow-y:auto; flex-grow:1;"></div>
                </div>
            </div>
        `;
        
        if (this.exerciseModal) this.exerciseModal.destroy();
        this.exerciseModal = new ExerciseModal(this.container, this.api, (newExercise) => {
            this.workoutData.exercises.push({ ...newExercise, sets: [{ weight: '', reps: '', completed: false }] });
            this.container.querySelector('#exModal').classList.remove('active'); 
            this.renderExercises();
            this.saveToLocal();
        });

        this.container.addEventListener('click', this._onClick);
        this.container.addEventListener('input', this._onInput);
        this.renderExercises();
        
        this.renderMediaPreviews();
        const fileInput = this.container.querySelector('#workoutFileInput');
        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const localUrl = URL.createObjectURL(file);
                const type = file.type.startsWith('video') ? 'video' : 'image';
                this.pendingMedia.push({ file, url: localUrl, type });
                this.renderMediaPreviews();
                fileInput.value = ''; 
            };
        }
    }

    renderExercises() {
        const list = this.container.querySelector('#exercises-list');
        const exercises = this.workoutData.exercises;
        if (!exercises || exercises.length === 0) {
            list.innerHTML = '<div class="empty-state">Упражнений пока нет</div>';
            return;
        }

        let groups = [];
        exercises.forEach((ex, i) => {
            if (ex.isSuperset && i > 0) groups[groups.length - 1].push({ ex, i });
            else groups.push([{ ex, i }]);
        });

        list.innerHTML = groups.map(group => {
            const isSS = group.length > 1;
            return `
                <div class="sortable-group" style="margin-bottom: 15px;">
                    ${group.map((item, idx) => {
                        const nameKey = (item.ex.name || '').trim().toLowerCase();
                        const prevSets = this.historyMap[nameKey] || [];
                        return renderExerciseCard(item, this.isEditing, isSS, idx === group.length - 1, idx, prevSets);
                    }).join('')}
                </div>`;
        }).join('');

        if (this.isEditing) this.initSortable();
    }

    renderMediaPreviews() {
        const container = this.container.querySelector('#mediaPreviewContainer');
        if (!container) return;

        const savedMedia = this.workoutData.media || [];
        const pendingMedia = this.pendingMedia || [];

        if (savedMedia.length === 0 && pendingMedia.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); font-size: 13px; padding: 5px 0;">Нет прикрепленных медиафайлов</div>';
            return;
        }

        let html = '';
        savedMedia.forEach((item, index) => { html += this.generateMediaCard(item, index, 'saved'); });
        pendingMedia.forEach((item, index) => { html += this.generateMediaCard(item, index, 'pending', true); });
        container.innerHTML = html;
    }

    generateMediaCard(item, index, type, isPending = false) {
        return `
            <div style="position: relative; width: 75px; height: 75px; border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color); background: var(--bg-color); ${isPending ? 'opacity: 0.8;' : ''}">
                ${item.type === 'video' ? `
                    <video src="${item.url}" style="width: 100%; height: 100%; object-fit: cover;"></video>
                    <span style="position: absolute; bottom: 4px; left: 4px; font-size: 10px; background: rgba(0,0,0,0.6); color: white; padding: 1px 4px; border-radius: 4px;">▶</span>
                ` : `
                    <img src="${item.url}" style="width: 100%; height: 100%; object-fit: cover;">
                `}
                ${isPending ? `<span style="position: absolute; bottom: 2px; right: 2px; font-size: 10px; background: var(--accent-color); color: white; padding: 1px 4px; border-radius: 4px;">⏳</span>` : ''}
                ${this.isEditing ? `
                    <button class="delete-media-btn" data-index="${index}" data-type="${type}" style="position: absolute; top: 2px; right: 2px; background: rgba(255,59,48,0.9); color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;">✕</button>
                ` : ''}
            </div>
        `;
    }

    renderModalList(exercisesArray) {
        const listHTML = exercisesArray.map(ex => {
            const primary = ex.primary_groups && ex.primary_groups.length > 0 ? ex.primary_groups[0] : (ex.category || 'Без категории');
            return `
            <div class="exercise-list-item" data-id="${ex.id}" data-name="${escapeHTML(ex.name)}" data-type="${ex.exercise_type}">
                <b>${escapeHTML(ex.name)}</b><br><small style="color:var(--text-secondary);">${escapeHTML(primary)}</small>
            </div>
        `}).join('');
        this.container.querySelector('#modalList').innerHTML = listHTML || '<div style="text-align:center; padding:15px; color:var(--text-secondary);">Не найдено</div>';
    }

    async handleClick(e) {
        const t = e.target;
        const idx = t.dataset?.idx;

        if (t.closest('#saveAsTemplateBtn')) {
            const name = prompt('Название шаблона:', this.workoutData.title);
            if (!name) return;

            let lastSSId = null;
            const preparedForTemplate = this.workoutData.exercises.map((ex, i) => {
                const next = this.workoutData.exercises[i + 1];
                if (next && next.isSuperset) { 
                    if (!lastSSId) lastSSId = `ss_tpl_${Date.now()}_${i}`; 
                } else if (!ex.isSuperset) {
                    lastSSId = null;
                }
                return { 
                    id: ex.id, 
                    superset_id: (ex.isSuperset || (next && next.isSuperset)) ? lastSSId : null,
                    sets: ex.sets 
                };
            });

            try {
                await this.api.createTemplate({ name, exercises: preparedForTemplate });
                alert('✅ Шаблон создан со всеми связями и подходами!');
            } catch (e) { alert('Ошибка сохранения шаблона'); }
        }

        if (t.id === 'mainActionBtn') {
            if (!this.isEditing) { this.isEditing = true; this.render(); }
            else this.handleSave();
            return;
        }

        if (t.id === 'deleteBtn' && confirm('Удалить?')) {
            await this.api.deleteWorkout(this.workoutId);
            localStorage.removeItem('gymcore_active_workout');
            window.gymcorePendingMedia = []; 
            window.location.hash = '';
            return;
        }
        if (t.id === 'cancelWorkoutBtn' || t.closest('#cancelWorkoutBtn')) {
            if (confirm('Сбросить текущую активную тренировку? Все не сохраненные данные и таймер будут удалены навсегда.')) {
                localStorage.removeItem('gymcore_active_workout'); // Стираем черновик
                window.gymcorePendingMedia = [];                  // Очищаем глобальные фото
                this.pendingMedia = [];                           // Очищаем локальные фото
                window.location.hash = '#templates';              // Уходим на вкладку программ
            }
            return;
        }
        if (t.classList?.contains('delete-set-btn') || t.closest('.delete-set-btn')) {
            const btn = t.classList.contains('delete-set-btn') ? t : t.closest('.delete-set-btn');
            const eIdx = parseInt(btn.dataset.exIdx);
            const sIdx = parseInt(btn.dataset.setIdx);
            
            // Защита: не даем удалить единственный подход
            if (this.workoutData.exercises[eIdx].sets.length > 1) {
                this.workoutData.exercises[eIdx].sets.splice(sIdx, 1);
                this.renderExercises();
                this.saveToLocal();
            } else {
                alert('Нельзя удалить единственный подход. Если нужно, удалите упражнение целиком.');
            }
            return;
        }
        if (t.classList?.contains('add-set-btn')) {
            this.workoutData.exercises[idx].sets.push({ weight: '', reps: '', completed: false });
            this.renderExercises();
            this.saveToLocal();
        }

        if (t.classList?.contains('set-check')) {
            const row = t.closest('.set-row');
            const set = this.workoutData.exercises[row.dataset.exIdx].sets[row.dataset.setIdx];
            set.completed = !set.completed;
            t.classList.toggle('completed');
            this.saveToLocal();
        }

        if (t.classList?.contains('menu-btn')) {
            document.querySelectorAll('.exercise-menu').forEach(m => m.classList.remove('active'));
            this.container.querySelector(`#menu-${idx}`)?.classList.add('active');
            e.stopPropagation();
        }

        if (!t.closest('.menu-btn') && !t.closest('.exercise-menu')) {
            document.querySelectorAll('.exercise-menu').forEach(m => m.classList.remove('active'));
        }

        if (t.classList?.contains('toggle-ss')) {
            this.workoutData.exercises[idx].isSuperset = !this.workoutData.exercises[idx].isSuperset;
            this.renderExercises();
            this.saveToLocal();
        }

        if (t.classList?.contains('delete-ex') && confirm('Удалить упражнение?')) {
            this.workoutData.exercises.splice(idx, 1);
            this.renderExercises();
            this.saveToLocal();
        }

        if (t.id === 'addExBtn') {
            this.container.querySelector('#exModal').classList.add('active');
            document.body.classList.add('modal-open');
            const res = await this.api.getExercises();
            if (res.success) { this.allExercisesCache = res.data; this.renderModalList(this.allExercisesCache); }
        }

        if (t.id === 'openCreateExBtn') {
            this.exerciseModal.open(); 
        }

        if (t.id === 'closeModal' || t.id === 'exModal') {
            this.container.querySelector('#exModal').classList.remove('active');
            document.body.classList.remove('modal-open');
        }

        if (t.closest('.exercise-list-item')) {
            const item = t.closest('.exercise-list-item');
            this.workoutData.exercises.push({ id: parseInt(item.dataset.id), name: item.dataset.name, exercise_type: item.dataset.type, sets: [{ weight: '', reps: '', completed: false }] });
            this.container.querySelector('#exModal').classList.remove('active');
            document.body.classList.remove('modal-open');
            this.renderExercises();
            this.saveToLocal();
        }

        if (t.id === 'triggerUploadBtn') {
            this.container.querySelector('#workoutFileInput').click();
            return;
        }

        if (t.classList.contains('delete-media-btn')) {
            const idx = parseInt(t.dataset.index);
            if (t.dataset.type === 'pending') this.pendingMedia.splice(idx, 1);
            else this.workoutData.media.splice(idx, 1);
            this.renderMediaPreviews();
            this.saveToLocal();
            return;
        }
    }

    handleInput(e) {
        const t = e.target;
        if (t.id === 'modalSearchInput') {
            const q = t.value.toLowerCase();
            this.renderModalList(this.allExercisesCache.filter(ex => {
                const searchStr = (ex.name + ' ' + (ex.category || '')).toLowerCase();
                return searchStr.includes(q);
            }));
        }
        if (t.id === 'titleInput') this.workoutData.title = t.value;
        if (t.id === 'dateInput') this.workoutData.workout_date = new Date(t.value).getTime();

        if (t.classList?.contains('edit-val')) {
            const row = t.closest('.set-row');
            this.workoutData.exercises[row.dataset.exIdx].sets[row.dataset.setIdx][t.dataset.field] = t.value;

            const prevVal = t.dataset.prev;
            const isWeight = t.dataset.field === 'weight';
            const className = isWeight ? 'weight-delta' : 'reps-delta';
            const wrapper = t.parentElement;
            let badge = wrapper.querySelector('.' + className);

            if (t.value !== '' && prevVal && prevVal !== 'null') {
                const diff = isWeight ? parseFloat(t.value) - parseFloat(prevVal) : parseInt(t.value) - parseInt(prevVal);
                
                if (diff !== 0 && !isNaN(diff)) {
                    const cleanDiff = isWeight ? parseFloat(diff.toFixed(1)) : diff;
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = className;
                        // Те же стили под степень (в правый верхний угол)
                        badge.style = 'font-size: 10px; font-weight: 800; position: absolute; top: -6px; right: 2px; background: var(--surface-color); padding: 0 4px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); z-index: 2; line-height: 1;';
                        wrapper.appendChild(badge);
                    }
                    badge.innerText = cleanDiff > 0 ? `+${cleanDiff}` : `${cleanDiff}`;
                    badge.style.color = cleanDiff > 0 ? '#34c759' : '#ff3b30';
                } else if (badge) { badge.remove(); }
            } else if (badge) { badge.remove(); }
        }
        this.saveToLocal();
    }

    async handleSave() {
        const btn = document.getElementById('mainActionBtn');
        btn.innerText = 'Загрузка...';
        btn.disabled = true;

        try {
            if (this.pendingMedia && this.pendingMedia.length > 0) {
                btn.innerText = 'Загрузка фото...';
                for (let i = 0; i < this.pendingMedia.length; i++) {
                    const item = this.pendingMedia[i];
                    const formData = new FormData();
                    formData.append('file', item.file);
                    
                    const uploadRes = await this.api.uploadFile(formData);
                    if (uploadRes.success) {
                        this.workoutData.media.push(uploadRes.data);
                    } else {
                        throw new Error(`Ошибка загрузки фото: ${uploadRes.message}`);
                    }
                }
                this.pendingMedia = []; 
                window.gymcorePendingMedia = [];
            }

            btn.innerText = 'Сохранение...';

            let lastSSId = null;
            const prepared = this.workoutData.exercises.map((ex, i) => {
                const next = this.workoutData.exercises[i + 1];
                if (!ex.isSuperset && !(next && next.isSuperset)) lastSSId = null; 
                if (!ex.isSuperset && next && next.isSuperset) lastSSId = `ss_${Date.now()}_${i}`; 
                return { ...ex, sets: ex.sets, superset_id: (ex.isSuperset || (next && next.isSuperset)) ? lastSSId : null };
            });

            let res;
            if (this.workoutId) {
                res = await this.api.updateWorkout(this.workoutId, { 
                    title: this.workoutData.title, 
                    workout_date: new Date(this.workoutData.workout_date), 
                    exercises: prepared,
                    media: this.workoutData.media 
                });
            } else {
                res = await this.api.createWorkout({ 
                    title: this.workoutData.title, 
                    workout_date: new Date(this.workoutData.workout_date), 
                    exercises: prepared,
                    media: this.workoutData.media 
                });
            }

            if (res.success) {
                localStorage.removeItem('gymcore_active_workout');
                if (this.workoutId) { 
                    this.isEditing = false; 
                    this.render(); 
                } else {
                    window.location.hash = '';
                }
            }
        } catch (e) { 
            alert('Ошибка сохранения'); 
        } finally { 
            btn.innerText = 'Сохранить'; 
            btn.disabled = false; 
        }
    }

    initSortable() {
        const el = this.container.querySelector('#exercises-list');
        if (this.sortableInstance) this.sortableInstance.destroy();
        this.sortableInstance = Sortable.create(el, {
            handle: '.drag-handle', animation: 150,
            onEnd: () => {
                const els = Array.from(el.querySelectorAll('.exercise-item-data'));
                this.workoutData.exercises = els.map(item => this.workoutData.exercises[parseInt(item.dataset.idx)]);
                if (this.workoutData.exercises[0]) this.workoutData.exercises[0].isSuperset = false;
                this.renderExercises();
                this.saveToLocal();
            }
        });
    }
}