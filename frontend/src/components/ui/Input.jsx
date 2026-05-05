import { useState } from 'react';
import { HiEye, HiEyeOff } from 'react-icons/hi';
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
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`input-group ${error ? 'input-error' : ''} ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          id={id}
          type={inputType}
          className={`input-field ${icon ? 'has-icon' : ''} ${isPassword ? 'has-password-toggle' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex="-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <HiEyeOff /> : <HiEye />}
          </button>
        )}
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
