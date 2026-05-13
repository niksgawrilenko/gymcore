// frontend/public/js/components/SetRow.js

export const renderSetRow = (s, sIdx, exIdx, isEditing, isCardio) => {
    return `
        <div class="set-row" data-ex-idx="${exIdx}" data-set-idx="${sIdx}">
            <div class="set-number">${sIdx + 1}</div>
            ${isEditing ? `
                <input type="number" class="set-input edit-val" data-field="weight" 
                    placeholder="${isCardio ? 'мин' : 'кг'}" value="${s.weight ?? ''}">
                <input type="number" class="set-input edit-val" data-field="reps" 
                    placeholder="${isCardio ? 'м' : 'раз'}" value="${s.reps ?? ''}">
            ` : `
                <div style="text-align:center; font-weight:600;">${s.weight || '-'}</div>
                <div style="text-align:center; font-weight:600;">${s.reps || '-'}</div>
            `}
            <button class="set-check ${s.completed ? 'completed' : ''}">✓</button>
        </div>
    `;
}; 