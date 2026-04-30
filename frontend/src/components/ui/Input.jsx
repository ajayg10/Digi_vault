import './Input.css';

export default function Input({
  label,
  error,
  icon,
  type = 'text',
  id,
  className = '',
  ...props
}) {
  return (
    <div className={`input-group ${error ? 'input-error' : ''} ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          id={id}
          type={type}
          className={`input-field ${icon ? 'has-icon' : ''}`}
          {...props}
        />
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}

export function TextArea({ label, error, id, className = '', ...props }) {
  return (
    <div className={`input-group ${error ? 'input-error' : ''} ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <textarea id={id} className="input-field textarea-field" {...props} />
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}
