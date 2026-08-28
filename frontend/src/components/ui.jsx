export function Badge({ status }) {
  if (!status) return null;
  const cls = `badge badge-${String(status).toLowerCase()}`;
  return <span className={cls}>{String(status).replace(/_/g, ' ')}</span>;
}

export function StatCard({ label, value, icon, color = 'var(--color-primary)', bg = 'var(--color-primary-light)' }) {
  return (
    <div className="stat-card">
      {icon && (
        <div className="icon-wrap" style={{ background: bg, color }}>
          {icon}
        </div>
      )}
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      {action}
    </div>
  );
}

export function Loading({ label = 'Loading...' }) {
  return <div className="loading-state">{label}</div>;
}

export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
