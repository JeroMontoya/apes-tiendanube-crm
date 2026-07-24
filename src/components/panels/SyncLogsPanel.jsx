import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, CheckCircle2, AlertTriangle, Database, Globe, Activity } from 'lucide-react';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  card: {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: 20,
    color: 'var(--on-surface)',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: 16,
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 500,
  },
  button: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  statusBox: {
    background: 'var(--surface-container)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: (isOk) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: isOk ? '#10b981' : '#ef4444',
    boxShadow: `0 0 8px ${isOk ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
  }),
  statusLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--on-surface)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-subtle)',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--on-surface-variant)',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-subtle)',
    fontSize: 13,
  },
  badge: (isSuccess) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 500,
    background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    color: isSuccess ? '#10b981' : '#ef4444',
  }),
  mono: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
  },
  loadingState: {
    padding: 40,
    textAlign: 'center',
    color: 'var(--on-surface-variant)',
    fontSize: 14,
  },
  errorState: {
    padding: 40,
    textAlign: 'center',
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  }
};

const SyncLogsPanel = ({ session }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/marketing/unified-metrics', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch metrics and logs');
      
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    if (!session?.access_token || syncing) return;
    
    setSyncing(true);
    try {
      const response = await fetch('/api/marketing/full-sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Sync failed');
      
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Error triggering sync: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.loadingState}>
          <RefreshCw size={24} style={{ animation: 'spin 2s linear infinite', marginBottom: 12 }} />
          <div>Loading status and logs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorState}>
        <AlertTriangle size={24} style={{ marginBottom: 12 }} />
        <div>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const platforms = [
    { name: 'Tiendanube', ok: data.platform_status?.tiendanube, icon: <Database size={14} /> },
    { name: 'Google SEO', ok: data.platform_status?.google_seo, icon: <Globe size={14} /> },
    { name: 'Google Analytics', ok: data.platform_status?.google_analytics, icon: <Activity size={14} /> },
    { name: 'Merchant Center', ok: data.platform_status?.merchant_center, icon: <Database size={14} /> },
    { name: 'Instagram', ok: data.platform_status?.instagram, icon: <Activity size={14} /> },
    { name: 'Benchmarking', ok: data.platform_status?.benchmarking, icon: <Activity size={14} /> }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Activity size={20} color="var(--primary)" />
            <h2 style={styles.title}>System Status</h2>
          </div>
          <button style={styles.button} onClick={handleSync} disabled={syncing}>
            <RefreshCw size={14} style={syncing ? { animation: 'spin 2s linear infinite' } : {}} />
            {syncing ? 'Syncing...' : 'Sync Producción'}
          </button>
        </div>

        <div style={styles.statusGrid}>
          {platforms.map(p => (
            <div key={p.name} style={styles.statusBox}>
              <div style={styles.statusDot(p.ok !== false)} />
              {p.icon}
              <span style={styles.statusLabel}>{p.name}</span>
            </div>
          ))}
        </div>

        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Clock size={20} color="var(--primary)" />
            <h2 style={styles.title}>Recent Sync Logs</h2>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Platform</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Details</th>
                <th style={styles.th}>Completed At</th>
              </tr>
            </thead>
            <tbody>
              {data.sync_logs?.length > 0 ? data.sync_logs.map((log, idx) => {
                const isSuccess = log.status === 'success';
                return (
                  <tr key={idx}>
                    <td style={styles.td}>
                      <strong>{log.platform}</strong>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge(isSuccess)}>
                        {isSuccess ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                        {log.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {isSuccess ? (
                        <span style={styles.mono}>{log.records_synced || 0} records</span>
                      ) : (
                        <span style={styles.errorText}>{log.error_message || 'Unknown error'}</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, ...styles.mono, color: 'var(--on-surface-variant)' }}>
                      {log.completed_at ? new Date(log.completed_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    No sync logs available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SyncLogsPanel;
