// frontend/public/js/components/SetRow.js
export const renderSetRow = (s, sIdx, exIdx, isEditing, isCardio, prevSet = null) => {
    const prevW = prevSet?.weight || '';
    const prevR = prevSet?.reps || '';

    const getBadge = (current, prev, isWeight) => {
        if (!current || !prev) return '';
        const diff = isWeight ? parseFloat(current) - parseFloat(prev) : parseInt(current) - parseInt(prev);
        if (isNaN(diff) || diff === 0) return '';
        const cleanDiff = isWeight ? parseFloat(diff.toFixed(1)) : diff;
        const color = cleanDiff > 0 ? '#34c759' : '#ff3b30';
        const sign = cleanDiff > 0 ? '+' : '';
        return `<span class="${isWeight ? 'weight-delta' : 'reps-delta'}" style="color: ${color}; font-size: 10px; font-weight: 800; position: absolute; top: -6px; right: 2px; background: var(--surface-color); padding: 0 4px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); z-index: 2; line-height: 1;">${sign}${cleanDiff}</span>`;
    };

    return `
        <div class="set-row" data-ex-idx="${exIdx}" data-set-idx="${sIdx}">
            <div class="set-number">${sIdx + 1}</div>
            ${isEditing ? `
                <div style="position: relative; width: 100%;">
                    ${getBadge(s.weight, prevW, true)}
                    <input type="number" step="0.1" class="set-input edit-val" data-field="weight" data-prev="${prevW}"
                        placeholder="${prevW || (isCardio ? 'мин' : 'кг')}" value="${s.weight ?? ''}">
                </div>
                <div style="position: relative; width: 100%;">
                    ${getBadge(s.reps, prevR, false)}
                    <input type="number" class="set-input edit-val" data-field="reps" data-prev="${prevR}"
                        placeholder="${prevR || (isCardio ? 'м' : 'раз')}" value="${s.reps ?? ''}">
                </div>
            ` : `
                <div style="text-align:center; font-weight:600;">${s.weight || '-'}</div>
                <div style="text-align:center; font-weight:600;">${s.reps || '-'}</div>
            `}
            
            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
                ${isEditing ? `<button class="delete-set-btn" data-ex-idx="${exIdx}" data-set-idx="${sIdx}" style="background: none; border: none; color: #ff3b30; font-size: 18px; font-weight: bold; cursor: pointer; padding: 0 5px; opacity: 0.7;">✕</button>` : ''}
                <button class="set-check ${s.completed ? 'completed' : ''}" data-ex-idx="${exIdx}" data-set-idx="${sIdx}" ${!isEditing ? 'disabled' : ''}>✓</button>
            </div>
        </div>
    `;
};