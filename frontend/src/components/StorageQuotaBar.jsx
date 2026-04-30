import './StorageQuotaBar.css';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function StorageQuotaBar({ quota }) {
  if (!quota) return null;

  const percentage = Math.min(quota.usage_percentage, 100);
  let barColor = 'var(--accent)';
  if (percentage > 90) barColor = 'var(--danger)';
  else if (percentage > 70) barColor = 'var(--warning)';

  return (
    <div className="quota-bar-container">
      <div className="quota-info">
        <span className="quota-label">Storage</span>
        <span className="quota-usage">
          {formatBytes(quota.used_bytes)} / {formatBytes(quota.total_quota_bytes)}
        </span>
      </div>
      <div className="quota-track">
        <div
          className="quota-fill"
          style={{ width: `${percentage}%`, background: barColor }}
        />
      </div>
      <span className="quota-count">{quota.file_count} files · {percentage.toFixed(1)}% used</span>
    </div>
  );
}
