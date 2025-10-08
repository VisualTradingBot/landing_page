import { useState, useEffect } from 'react';
import analytics from '../utils/analytics';
import './analyticsDashboard.scss';

/**
 * Analytics Dashboard Component
 * Shows collected analytics data - useful for development/testing
 */
const AnalyticsDashboard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    const storedEvents = analytics.getStoredEvents();
    const sessionSummary = analytics.getSessionSummary();
    setEvents(storedEvents);
    setSummary(sessionSummary);
  };

  const clearData = () => {
    if (confirm('Clear all stored analytics data?')) {
      analytics.clearStoredEvents();
      setEvents([]);
    }
  };

  const getEventStats = () => {
    const stats = {
      total: events.length,
      pageviews: events.filter(e => e.type === 'pageview').length,
      customEvents: events.filter(e => e.type === 'custom_event').length,
      sessionEnds: events.filter(e => e.type === 'session_end').length,
    };
    return stats;
  };

  const stats = getEventStats();

  if (!isOpen) {
    return (
      <button
        className="analytics-toggle"
        onClick={() => setIsOpen(true)}
        title="Open Analytics Dashboard"
      >
        📊
      </button>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>Analytics Dashboard</h2>
        <div className="analytics-actions">
          <button onClick={loadData} className="refresh-btn">🔄 Refresh</button>
          <button onClick={clearData} className="clear-btn">🗑️ Clear</button>
          <button onClick={() => setIsOpen(false)} className="close-btn">✕</button>
        </div>
      </div>

      <div className="analytics-tabs">
        <button
          className={activeTab === 'summary' ? 'active' : ''}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={activeTab === 'events' ? 'active' : ''}
          onClick={() => setActiveTab('events')}
        >
          Events ({stats.total})
        </button>
      </div>

      <div className="analytics-content">
        {activeTab === 'summary' && summary && (
          <div className="summary-view">
            <div className="stat-card">
              <h3>Session Info</h3>
              <p><strong>Session ID:</strong> {summary.sessionId}</p>
              <p><strong>Duration:</strong> {Math.floor(summary.duration / 60)}m {summary.duration % 60}s</p>
              <p><strong>Page Views:</strong> {summary.pageViews}</p>
            </div>

            <div className="stat-card">
              <h3>Device Info</h3>
              <p><strong>Type:</strong> {summary.device.deviceType}</p>
              <p><strong>Browser:</strong> {summary.device.browser}</p>
              <p><strong>Viewport:</strong> {summary.device.viewport}</p>
            </div>

            <div className="stat-card">
              <h3>Traffic Source</h3>
              <p><strong>Referrer:</strong> {summary.referrer}</p>
            </div>

            <div className="stat-card">
              <h3>Event Statistics</h3>
              <p><strong>Total Events:</strong> {stats.total}</p>
              <p><strong>Page Views:</strong> {stats.pageviews}</p>
              <p><strong>Custom Events:</strong> {stats.customEvents}</p>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="events-view">
            {events.length === 0 ? (
              <p className="no-events">No events recorded yet</p>
            ) : (
              <div className="events-list">
                {events.slice().reverse().map((event, index) => (
                  <div key={index} className="event-item">
                    <div className="event-header">
                      <span className={`event-type ${event.type}`}>
                        {event.type}
                      </span>
                      <span className="event-time">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="event-details">
                      <pre>{JSON.stringify(event, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

