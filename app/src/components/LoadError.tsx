export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="card-outlined p-5 space-y-3">
    <p style={{ color: 'var(--md-on-surface)' }}>{message}</p>
    <button className="btn-outlined" onClick={onRetry}>Tentar de novo</button>
  </div>;
}
