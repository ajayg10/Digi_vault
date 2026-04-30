import './Card.css';

export default function Card({ children, className = '', hover = false, onClick, ...props }) {
  return (
    <div
      className={`card ${hover ? 'card-hover' : ''} ${onClick ? 'card-clickable' : ''} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
