'use client';
// Exercise list with sets. Used by the active workout, the history editor and the template builder.
// A superset is a group of consecutive exercises and is dragged as a whole.
import { useTranslations } from 'next-intl';
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
import { useEffect, useMemo, useState, useSyncExternalStore, type HTMLAttributes } from 'react';
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
  showChecks?: boolean; // "done" checkboxes — on the workout screens only
  prevSets?: PrevSetsMap; // active workout only -> shows the "previous" column
  allExercises?: ExerciseListItem[];
  emptyText?: string;
};

// "Collapse all" is a shared setting for every list, stored in localStorage
const COLLAPSED_KEY = 'gymcore_sets_collapsed';
const COLLAPSED_EVENT = 'gymcore:collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function setCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');
  } catch {}
  window.dispatchEvent(new Event(COLLAPSED_EVENT));
}

function subscribeCollapsed(cb: () => void) {
  window.addEventListener(COLLAPSED_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(COLLAPSED_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function ExerciseListEditor({ exercises, onChange, editing, showChecks = true, prevSets, allExercises = [], emptyText }: Props) {
  const t = useTranslations('editor');
  // 'add' = new exercise, a number = index of the exercise being replaced
  const [picker, setPicker] = useState<'add' | number | null>(null);
  const allCollapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  // Per-exercise manual collapsing on top of the global flag (reset by the "all" button)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isCollapsed = (key: string) => overrides[key] ?? allCollapsed;
  const everyCollapsed = exercises.length > 0 && exercises.every((ex) => isCollapsed(ex.key));
  const toggleAll = () => {
    setOverrides({});
    setCollapsed(!everyCollapsed);
  };
  const [info, setInfo] = useState<ExerciseInfo | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Grouping and the sortable id list are derived from the exercise list only — memoize them so that
  // typing in a set input does not rebuild both arrays on every keystroke.
  const groups = useMemo(() => groupExercises(exercises), [exercises]);
  const groupIds = useMemo(() => groups.map((g) => g[0].item.key), [groups]);
  const update = (index: number, patch: Partial<EditorExercise>) =>
    onChange(exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = groupIds;
    const moved = arrayMove(groups, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    // The first exercise of each group is the head and is never linked to the previous one
    onChange(moved.flatMap((g) => g.map(({ item }, j) => (j === 0 ? { ...item, isSuperset: false } : item))));
  }

  function addExercise(ex: ExerciseInfo) {
    onChange([...exercises, { ...ex, key: newKey(), isSuperset: false, sets: [emptySet()] }]);
  }

  // The key and the superset link are kept. Sets are carried over when the exercise type matches
  // (strength/cardio), otherwise the same number of empty ones: kilograms and minutes are not interchangeable.
  function replaceExercise(index: number, ex: ExerciseInfo) {
    const old = exercises[index];
    const sets = ex.exercise_type === old.exercise_type ? old.sets : old.sets.map(emptySet);
    update(index, { ...ex, sets });
  }

  const onPick = (ex: ExerciseInfo) => (picker === 'add' ? addExercise(ex) : picker !== null && replaceExercise(picker, ex));

  const list =
    exercises.length === 0 ? (
      <div className="empty-state">{emptyText ?? t('empty')}</div>
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
                collapsed={isCollapsed(item.key)}
                onToggleCollapsed={() => setOverrides({ ...overrides, [item.key]: !isCollapsed(item.key) })}
                prev={prevSets?.[nameKey(item.name)]}
                showPrev={!!prevSets}
                handleProps={handleProps}
                onChangeSets={(sets) => update(index, { sets })}
                onToggleSuperset={() => update(index, { isSuperset: !item.isSuperset })}
                onReplace={() => setPicker(index)}
                onRemove={() => confirm(t('confirmDelete')) && onChange(exercises.filter((_, i) => i !== index))}
                onInfo={() => setInfo(item)}
              />
            ))
          }
        </Group>
      ))
    );

  return (
    <>
      {exercises.length > 0 && (
        <div className="list-toolbar">
          <span className="caps">{t('header', { count: exercises.length })}</span>
          <button type="button" className="link-btn" onClick={toggleAll}>
            {everyCollapsed ? t('expandAll') : t('collapseAll')}
          </button>
        </div>
      )}
      {editing ? (
        <DndContext id="exercise-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
            {list}
          </SortableContext>
        </DndContext>
      ) : (
        list
      )}

      {editing && (
        <>
          <button type="button" className="outline-btn" onClick={() => setPicker('add')}>
            {t('addExercise')}
          </button>
          <ExercisePicker
            open={picker !== null}
            title={picker === 'add' ? undefined : t('replaceTitle')}
            exercises={allExercises}
            onClose={() => setPicker(null)}
            onPick={onPick}
          />
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
  collapsed,
  onToggleCollapsed,
  prev = [],
  showPrev,
  handleProps,
  onChangeSets,
  onToggleSuperset,
  onReplace,
  onRemove,
  onInfo,
}: {
  ex: EditorExercise;
  index: number;
  position: 'single' | 'first' | 'middle' | 'last';
  editing: boolean;
  showChecks: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  prev?: PrevSetsMap[string];
  showPrev: boolean;
  handleProps: HandleProps;
  onChangeSets: (sets: EditorSet[]) => void;
  onToggleSuperset: () => void;
  onReplace: () => void;
  onRemove: () => void;
  onInfo: () => void;
}) {
  const t = useTranslations('editor');
  const [menuOpen, setMenuOpen] = useState(false);
  const isCardio = ex.exercise_type === 'cardio';

  // Close the "⋮" menu on any click outside
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const setAt = (i: number, patch: Partial<EditorSet>) => onChangeSets(ex.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const ssClass = position === 'single' ? '' : ` superset-card ss-${position}`;
  const done = ex.sets.filter((s) => s.completed).length;
  // Set grid: # | [previous] | weight | reps | [✓] | [✕]
  const cols = ['28px', showPrev && 'minmax(0, 1fr)', 'minmax(0, 1.1fr)', 'minmax(0, 1.1fr)', showChecks && '40px', editing && '24px']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`card exercise-card${ssClass}${collapsed ? ' collapsed' : ''}`}>
      <div className="row-between">
        <h4 className="exercise-title">
          {editing && (
            <span className="drag-handle" {...handleProps} aria-label={t('drag')}>
              ≡
            </span>
          )}
          <span className="grow clickable" onClick={onToggleCollapsed} title={collapsed ? t('expand') : t('collapse')}>
            {index + 1}. {ex.name}
          </span>
          {collapsed && (
            <span className={`pill${showChecks && done === ex.sets.length ? ' pill-done' : ''}`}>
              {showChecks ? `${done}/${ex.sets.length}` : ex.sets.length}
            </span>
          )}
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
          <button type="button" className="ghost-btn muted" style={{ fontSize: 16 }} onClick={onInfo} aria-label={t('info')}>
            ℹ️
          </button>
        )}
      </div>

      <div className={`exercise-menu${menuOpen ? ' active' : ''}`}>
        <button type="button" className="menu-item" onClick={onInfo}>
          {t('info')}
        </button>
        {index > 0 && (
          <button type="button" className="menu-item" onClick={onToggleSuperset}>
            🔗 {ex.isSuperset ? t('detach') : t('superset')}
          </button>
        )}
        <button type="button" className="menu-item" onClick={onReplace}>
          {t('replace')}
        </button>
        <button type="button" className="menu-item" onClick={onToggleCollapsed}>
          {collapsed ? `▾ ${t('expand')}` : `▴ ${t('collapse')}`}
        </button>
        <button type="button" className="menu-item danger" onClick={onRemove}>
          {t('deleteItem')}
        </button>
      </div>

      {!collapsed && (
        <div className="sets" style={{ '--set-cols': cols } as React.CSSProperties}>
          <div className="set-header">
            <div>#</div>
            {showPrev && <div>{t('colPrev')}</div>}
            <div>{isCardio ? t('colMin') : t('colKg')}</div>
            <div>{isCardio ? t('colMeters') : t('colReps')}</div>
            {showChecks && <div>✓</div>}
            {editing && <div></div>}
          </div>

          {ex.sets.map((s, i) => (
            <SetRow
              key={i}
              set={s}
              number={i + 1}
              editing={editing}
              showCheck={showChecks}
              showPrev={showPrev}
              isCardio={isCardio}
              prev={prev[i]}
              onChange={(patch) => setAt(i, patch)}
              onRemove={() =>
                ex.sets.length > 1
                  ? onChangeSets(ex.sets.filter((_, j) => j !== i))
                  : alert(t('onlySet'))
              }
            />
          ))}

          {editing && (
            <button type="button" className="add-set-btn" onClick={() => onChangeSets([...ex.sets, emptySet()])}>
              {t('addSet')}
            </button>
          )}
        </div>
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
  showPrev,
  isCardio,
  prev,
  onChange,
  onRemove,
}: {
  set: EditorSet;
  number: number;
  editing: boolean;
  showCheck: boolean;
  showPrev: boolean;
  isCardio: boolean;
  prev?: PrevSetsMap[string][number];
  onChange: (patch: Partial<EditorSet>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('editor');
  const prevW = prev?.weight != null ? String(Number(prev.weight)) : '';
  const prevR = prev?.reps != null ? String(prev.reps) : '';
  const prevText = prevW || prevR ? [prevW || '–', prevR || '–'].join(isCardio ? ' / ' : ' × ') : '—';

  // Marking a set as done while the fields are empty -> fill in the previous result
  const toggleDone = () => {
    const completed = !set.completed;
    onChange({
      completed,
      ...(completed && set.weight === '' && prevW && { weight: prevW }),
      ...(completed && set.reps === '' && prevR && { reps: prevR }),
    });
  };

  return (
    <div className={`set-row${set.completed && showCheck ? ' done' : ''}`}>
      <div className="set-number">{number}</div>
      {showPrev && (
        <button
          type="button"
          className="set-prev"
          disabled={!editing || (!prevW && !prevR)}
          onClick={() => onChange({ weight: prevW, reps: prevR })}
          title={t('usePrev')}
        >
          {prevText}
        </button>
      )}
      {editing ? (
        <>
          <div className="set-cell">
            <Delta current={set.weight} prev={prevW} isWeight />
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className="set-input"
              placeholder={prevW || (isCardio ? t('phMin') : t('phKg'))}
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
              placeholder={prevR || (isCardio ? t('phM') : t('phReps'))}
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
      {showCheck && (
        <button type="button" className={`set-check${set.completed ? ' completed' : ''}`} disabled={!editing} onClick={toggleDone}>
          ✓
        </button>
      )}
      {editing && (
        <button type="button" className="delete-set-btn" onClick={onRemove} aria-label={t('deleteSet')}>
          ✕
        </button>
      )}
    </div>
  );
}
