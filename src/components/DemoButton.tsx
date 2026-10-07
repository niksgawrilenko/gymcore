'use client';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { startDemo, type DemoState } from '@/actions/demo';

/**
 * "Try the demo" button: posts to the startDemo action, which creates an ephemeral account and signs in.
 * `label` overrides the button text (otherwise demo.cta); `block` makes it full-width (login page).
 */
export function DemoButton({
  className = 'ghost-btn accent-text bold',
  label,
  block = false,
}: {
  className?: string;
  label?: string;
  block?: boolean;
}) {
  const t = useTranslations('demo');
  const tError = useTranslations('demo.errors');
  const [state, action, pending] = useActionState<DemoState, FormData>(startDemo, undefined);

  return (
    <form action={action} style={block ? { width: '100%' } : undefined}>
      <button
        type="submit"
        className={className}
        disabled={pending}
        style={block ? { width: '100%' } : undefined}
      >
        {pending ? t('pending') : (label ?? t('cta'))}
      </button>
      {state?.error && <div className="error-box" style={{ marginTop: 8 }}>{tError(state.error)}</div>}
    </form>
  );
}
