// frontend/public/js/components/ExerciseCard.js

import { escapeHTML } from '../utils/helpers.js';
import { renderSetRow } from './SetRow.js';

// ВОТ ЗДЕСЬ ДОБАВЛЕН ШЕСТОЙ ПАРАМЕТР: prevSets = []
export const renderExerciseCard = (item, isEditing, isSS, isLastInGroup, groupIdx, prevSets = []) => {
    const { ex, i } = item;
    const isCardio = ex.exercise_type === 'cardio';
    
    // Прокидываем прошлые подходы в каждую строку
    const setsHTML = ex.sets.map((s, sIdx) => {
        const prevSet = prevSets[sIdx] || null;
        return renderSetRow(s, sIdx, i, isEditing, isCardio, prevSet);
    }).join('');

    const borderRadius = isSS 
        ? (groupIdx === 0 ? '14px 14px 0 0' : (isLastInGroup ? '0 0 14px 14px' : '0')) 
        : '14px';

    return `
        <div class="card exercise-item-data ${isSS ? 'superset-card' : ''}" 
             data-idx="${i}" 
             style="position: relative; margin-bottom:${isSS && !isLastInGroup ? '0' : '10px'}; border-radius:${borderRadius};">
            
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4 style="margin-bottom:10px; display:flex; align-items:center; gap:8px;">
                    ${isEditing ? '<span class="drag-handle" style="color:var(--text-secondary); cursor:grab;">≡</span>' : ''}
                    ${i + 1}. ${escapeHTML(ex.name)}
                </h4>
                ${isEditing ? `<button class="menu-btn" data-idx="${i}" style="background:none; border:none; color:var(--text-secondary); font-size:20px; cursor:pointer;">⋮</button>` : ''}
            </div>

            <div class="exercise-menu" id="menu-${i}">
                <button class="menu-item toggle-ss" data-idx="${i}">🔗 ${ex.isSuperset ? 'Открепить' : 'Суперсет'}</button>
                <button class="menu-item danger delete-ex" data-idx="${i}">🗑 Удалить</button>
            </div>

            <div class="set-header">
                <div>П-Д</div>
                <div>${isCardio ? 'ВРЕМЯ' : 'ВЕС'}</div>
                <div>${isCardio ? 'МЕТРЫ' : 'ПОВТ'}</div>
                <div></div>
            </div>

            ${setsHTML}

            ${isEditing ? `
                <button class="add-set-btn" data-idx="${i}" 
                    style="width:100%; border: 1px dashed var(--border-color); background:none; padding: 8px; border-radius: 8px; cursor:pointer; margin-top:10px; font-weight:600; color:var(--text-primary);">
                    + Добавить подход
                </button>
            ` : ''}
        </div>
    `;
};