import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Users, Zap, TrendingUp, Activity, Heart, MessageCircle } from 'lucide-react';

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
    gap: 12,
    marginBottom: 20,
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 500,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  kpiBox: {
    background: 'var(--surface-container)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  kpiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  kpiLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--on-surface-variant)',
    margin: 0,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 600,
    fontFamily: 'JetBrains Mono, monospace',
    margin: 0,
  },
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  mediaCard: {
    background: 'var(--surface-container-lowest)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
    background: 'var(--surface-container)',
  },
  mediaContent: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  caption: {
    fontSize: 13,
    color: 'var(--on-surface)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    margin: 0,
  },
  mediaStats: {
    display: 'flex',
    gap: 16,
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: 12,
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: 'var(--on-surface-variant)',
    fontFamily: 'JetBrains Mono, monospace',
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
    color: 'red',
    background: 'rgba(255, 0, 0, 0.05)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(255, 0, 0, 0.2)',
  }
};

const InstagramPanel = ({ session }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/marketing/instagram-data', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch Instagram data');
      
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

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.loadingState}>
          <Activity size={24} style={{ animation: 'spin 2s linear infinite', marginBottom: 12 }} />
          <div>Loading Instagram data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorState}>
        <Zap size={24} style={{ marginBottom: 12 }} />
        <div>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Camera size={20} color="var(--primary)" />
          <h2 style={styles.title}>Instagram Overview</h2>
        </div>
        
        <div style={styles.kpiGrid}>
          <div style={styles.kpiBox}>
            <div style={styles.kpiHeader}>
              <Users size={14} color="var(--primary)" />
              <p style={styles.kpiLabel}>Followers</p>
            </div>
            <p style={styles.kpiValue}>{data.followers_count?.toLocaleString() || 0}</p>
          </div>
          <div style={styles.kpiBox}>
            <div style={styles.kpiHeader}>
              <Activity size={14} color="var(--primary)" />
              <p style={styles.kpiLabel}>Engagement Rate</p>
            </div>
            <p style={styles.kpiValue}>{data.engagement_rate || '0.0'}%</p>
          </div>
          <div style={styles.kpiBox}>
            <div style={styles.kpiHeader}>
              <TrendingUp size={14} color="var(--primary)" />
              <p style={styles.kpiLabel}>Avg Likes</p>
            </div>
            <p style={styles.kpiValue}>{data.avg_likes_per_post || 0}</p>
          </div>
          <div style={styles.kpiBox}>
            <div style={styles.kpiHeader}>
              <TrendingUp size={14} color="var(--primary)" />
              <p style={styles.kpiLabel}>Avg Comments</p>
            </div>
            <p style={styles.kpiValue}>{data.avg_comments_per_post || 0}</p>
          </div>
        </div>

        <div style={styles.header}>
          <h3 style={{ ...styles.title, fontSize: 14 }}>Recent Posts</h3>
        </div>

        <div style={styles.mediaGrid}>
          {data.media_feed?.map((post) => (
            <div key={post.id} style={styles.mediaCard}>
              <img src={post.thumbnail_url || post.media_url} alt="Post thumbnail" style={styles.thumbnail} />
              <div style={styles.mediaContent}>
                <p style={styles.caption}>{post.caption || 'No caption'}</p>
                <div style={styles.mediaStats}>
                  <div style={styles.statItem}>
                    <Heart size={14} /> {post.like_count || 0}
                  </div>
                  <div style={styles.statItem}>
                    <MessageCircle size={14} /> {post.comments_count || 0}
                  </div>
                  <div style={{ ...styles.statItem, marginLeft: 'auto', color: 'var(--primary)' }}>
                    {new Date(post.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!data.media_feed || data.media_feed.length === 0) && (
            <div style={{ gridColumn: '1 / -1', ...styles.loadingState }}>
              No recent posts found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramPanel;
