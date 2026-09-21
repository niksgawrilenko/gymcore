'use client';
// Список упражнений с подходами. Используется в активной тренировке, при правке тренировки из истории
// и в конструкторе шаблонов. Суперсет = группа подряд идущих упражнений, перетаскивается целиком.
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useState, type HTMLAttributes } from 'react';
import {
  emptySet,
  groupExercises,
  nameKey,
  newKey,
  type EditorExercise,
  type EditorSet,
  type ExerciseInfo,
  type ExerciseListItem,
  type PrevSetsMap,
} from '@/lib/types';
import { ExerciseInfoModal, ExercisePicker } from './ExerciseModals';

type Props = {
  exercises: EditorExercise[];
  onChange: (next: EditorExercise[]) => void;
  editing: boolean;
  showChecks?: boolean; // галочки «выполнено» — только в тренировке
  prevSets?: PrevSetsMap;
  allExercises?: ExerciseListItem[];
  emptyText?: string;
};

export function ExerciseListEditor({ exercises, onChange, editing, showChecks = true, prevSets = {}, allExercises = [], emptyText }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [info, setInfo] = useState<ExerciseInfo | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const groups = groupExercises(exercises);
  const update = (index: number, patch: Partial<EditorExercise>) =>
    onChange(exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = groups.map((g) => g[0].item.key);
    const moved = arrayMove(groups, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    // Первое упражнение каждой группы — «голова», не связанная с предыдущим
    onChange(moved.flatMap((g) => g.map(({ item }, j) => (j === 0 ? { ...item, isSuperset: false } : item))));
  }

  function addExercise(ex: ExerciseInfo) {
    onChange([...exercises, { ...ex, key: newKey(), isSuperset: false, sets: [emptySet()] }]);
  }

  const list =
    exercises.length === 0 ? (
      <div className="empty-state">{emptyText ?? 'Упражнений пока нет'}</div>
    ) : (
      groups.map((group) => (
        <Group key={group[0].item.key} id={group[0].item.key} sortable={editing}>
          {(handleProps) =>
            group.map(({ item, index }, j) => (
              <ExerciseCard
                key={item.key}
                ex={item}
                index={index}
                position={group.length === 1 ? 'single' : j === 0 ? 'first' : j === group.length - 1 ? 'last' : 'middle'}
                editing={editing}
                showChecks={showChecks}
                prev={prevSets[nameKey(item.name)] ?? []}
                handleProps={handleProps}
                onChangeSets={(sets) => update(index, { sets })}
                onToggleSuperset={() => update(index, { isSuperset: !item.isSuperset })}
                onRemove={() => confirm('Удалить упражнение?') && onChange(exercises.filter((_, i) => i !== index))}
                onInfo={() => setInfo(item)}
              />
            ))
          }
        </Group>
      ))
    );

  return (
    <>
      {editing ? (
        <DndContext id="exercise-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={groups.map((g) => g[0].item.key)} strategy={verticalListSortingStrategy}>
            {list}
          </SortableContext>
        </DndContext>
      ) : (
        list
      )}

      {editing && (
        <>
          <button type="button" className="outline-btn" onClick={() => setPickerOpen(true)}>
            + Добавить упражнение
          </button>
          <ExercisePicker open={pickerOpen} exercises={allExercises} onClose={() => setPickerOpen(false)} onPick={addExercise} />
        </>
      )}
      <ExerciseInfoModal exercise={info} onClose={() => setInfo(null)} />
    </>
  );
}

type HandleProps = HTMLAttributes<HTMLElement> | undefined;

type GroupProps = { id: string; children: (h: HandleProps) => React.ReactNode };

function Group({ sortable, ...props }: GroupProps & { sortable: boolean }) {
  return sortable ? <SortableGroup {...props} /> : <div className="sortable-group">{props.children(undefined)}</div>;
}

function SortableGroup({ id, children }: GroupProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`sortable-group${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

function ExerciseCard({
  ex,
  index,
  position,
  editing,
  showChecks,
  prev,
  handleProps,
  onChangeSets,
  onToggleSuperset,
  onRemove,
  onInfo,
}: {
  ex: EditorExercise;
  index: number;
  position: 'single' | 'first' | 'middle' | 'last';
  editing: boolean;
  showChecks: boolean;
  prev: PrevSetsMap[string];
  handleProps: HandleProps;
  onChangeSets: (sets: EditorSet[]) => void;
  onToggleSuperset: () => void;
  onRemove: () => void;
  onInfo: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isCardio = ex.exercise_type === 'cardio';

  // Закрытие меню «⋮» по клику в любом месте
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const setAt = (i: number, patch: Partial<EditorSet>) => onChangeSets(ex.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const ssClass = position === 'single' ? '' : ` superset-card ss-${position}`;

  return (
    <div className={`card exercise-card${ssClass}`}>
      <div className="row-between">
        <h4 className="exercise-title">
          {editing && (
            <span className="drag-handle" {...handleProps} aria-label="Перетащить">
              ≡
            </span>
          )}
          {index + 1}. {ex.name}
        </h4>
        {editing ? (
          <button
            type="button"
            className="ghost-btn muted"
            style={{ fontSize: 20, padding: '0 10px' }}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
          >
            ⋮
          </button>
        ) : (
          <button type="button" className="ghost-btn muted" style={{ fontSize: 16 }} onClick={onInfo} aria-label="Информация">
            ℹ️
          </button>
        )}
      </div>

      <div className={`exercise-menu${menuOpen ? ' active' : ''}`}>
        <button type="button" className="menu-item" onClick={onInfo}>
          ℹ️ Информация
        </button>
        {index > 0 && (
          <button type="button" className="menu-item" onClick={onToggleSuperset}>
            🔗 {ex.isSuperset ? 'Открепить' : 'Суперсет с предыдущим'}
          </button>
        )}
        <button type="button" className="menu-item danger" onClick={onRemove}>
          🗑 Удалить
        </button>
      </div>

      <div className="set-header">
        <div>П-Д</div>
        <div>{isCardio ? 'ВРЕМЯ' : 'ВЕС'}</div>
        <div>{isCardio ? 'МЕТРЫ' : 'ПОВТ'}</div>
        <div></div>
      </div>

      {ex.sets.map((s, i) => (
        <SetRow
          key={i}
          set={s}
          number={i + 1}
          editing={editing}
          showCheck={showChecks}
          isCardio={isCardio}
          prev={prev[i]}
          onChange={(patch) => setAt(i, patch)}
          onRemove={() =>
            ex.sets.length > 1
              ? onChangeSets(ex.sets.filter((_, j) => j !== i))
              : alert('Нельзя удалить единственный подход. Если нужно, удалите упражнение целиком.')
          }
        />
      ))}

      {editing && (
        <button type="button" className="dashed-btn" onClick={() => onChangeSets([...ex.sets, emptySet()])}>
          + Добавить подход
        </button>
      )}
    </div>
  );
}

function Delta({ current, prev, isWeight }: { current: string; prev: string; isWeight: boolean }) {
  if (current === '' || prev === '') return null;
  const diff = Number(current) - Number(prev);
  if (!diff || Number.isNaN(diff)) return null;
  const clean = isWeight ? Number(diff.toFixed(1)) : Math.round(diff);
  return <span className={`delta ${clean > 0 ? 'up' : 'down'}`}>{clean > 0 ? `+${clean}` : clean}</span>;
}

function SetRow({
  set,
  number,
  editing,
  showCheck,
  isCardio,
  prev,
  onChange,
  onRemove,
}: {
  set: EditorSet;
  number: number;
  editing: boolean;
  showCheck: boolean;
  isCardio: boolean;
  prev?: PrevSetsMap[string][number];
  onChange: (patch: Partial<EditorSet>) => void;
  onRemove: () => void;
}) {
  const prevW = prev?.weight != null ? String(Number(prev.weight)) : '';
  const prevR = prev?.reps != null ? String(prev.reps) : '';

  // Отметили подход выполненным с пустыми полями -> подставляем прошлый результат
  const toggleDone = () => {
    const completed = !set.completed;
    onChange({
      completed,
      ...(completed && set.weight === '' && prevW && { weight: prevW }),
      ...(completed && set.reps === '' && prevR && { reps: prevR }),
    });
  };

  return (
    <div className="set-row">
      <div className="set-number">{number}</div>
      {editing ? (
        <>
          <div className="set-cell">
            <Delta current={set.weight} prev={prevW} isWeight />
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className="set-input"
              placeholder={prevW || (isCardio ? 'мин' : 'кг')}
              value={set.weight}
              onChange={(e) => onChange({ weight: e.target.value })}
            />
          </div>
          <div className="set-cell">
            <Delta current={set.reps} prev={prevR} isWeight={false} />
            <input
              type="number"
              inputMode="numeric"
              className="set-input"
              placeholder={prevR || (isCardio ? 'м' : 'раз')}
              value={set.reps}
              onChange={(e) => onChange({ reps: e.target.value })}
            />
          </div>
        </>
      ) : (
        <>
          <div className="set-value">{set.weight || '-'}</div>
          <div className="set-value">{set.reps || '-'}</div>
        </>
      )}
      <div className="set-actions">
        {editing && (
          <button type="button" className="delete-set-btn" onClick={onRemove} aria-label="Удалить подход">
            ✕
          </button>
        )}
        {showCheck && (
          <button type="button" className={`set-check${set.completed ? ' completed' : ''}`} disabled={!editing} onClick={toggleDone}>
            ✓
          </button>
        )}
      </div>
    </div>
  );
}
