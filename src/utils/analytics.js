/**
 * Privacy-Friendly Analytics Utility
 * Collects basic, non-personal metrics without cookies
 * Integrated with Supabase for direct database storage
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase.js';

class Analytics {
  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.sessionStartTime = Date.now();
    this.pageViewCount = 0;
    this.supabase = null;
    
    // Initialize Supabase client if configured
    this.initializeSupabase();
    
    // Initialize session tracking
    this.initializeTracking();
  }

  /**
   * Initialize Supabase client
   */
  async initializeSupabase() {
    if (isSupabaseConfigured()) {
      try {
        this.supabase = await getSupabaseClient();
        
        if (this.supabase && import.meta.env.DEV) {
          console.log('[Analytics] ✅ Supabase connected');
        }
      } catch (error) {
        console.warn('[Analytics] Supabase not available. Install with: npm install @supabase/supabase-js');
        console.warn('[Analytics] Falling back to localStorage only');
      }
    } else if (import.meta.env.DEV) {
      console.log('[Analytics] 📦 Using localStorage (dev mode)');
      console.log('[Analytics] Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env for database storage');
    }
  }

  /**
   * Generate or retrieve anonymous session ID
   * Stored in sessionStorage (cleared when browser closes)
   */
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      // Generate random session ID (not tied to user)
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get device information from user agent
   */
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      deviceType = 'tablet';
    } else if (
      /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)
    ) {
      deviceType = 'mobile';
    }

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

    return {
      deviceType,
      browser,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  /**
   * Get referrer information
   */
  getReferrer() {
    const referrer = document.referrer;
    if (!referrer) return 'direct';
    
    try {
      const referrerUrl = new URL(referrer);
      const currentUrl = new URL(window.location.href);
      
      // If same domain, it's internal navigation
      if (referrerUrl.hostname === currentUrl.hostname) {
        return 'internal';
      }
      
      // Return just the domain, not full URL (for privacy)
      return referrerUrl.hostname;
    } catch (e) {
      return 'unknown';
    }
  }

  /**
   * Track a page view
   */
  trackPageView(pagePath = window.location.pathname) {
    this.pageViewCount++;
    
    const event = {
      type: 'pageview',
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      page: {
        path: pagePath,
        url: window.location.href.split('?')[0], // Remove query params for privacy
        title: document.title,
      },
      referrer: this.getReferrer(),
      device: this.getDeviceInfo(),
      pagesInSession: this.pageViewCount,
    };

    this.sendEvent(event);
    return event;
  }

  /**
   * Track session duration on page leave
   */
  trackSessionEnd() {
    const sessionDuration = Math.round((Date.now() - this.sessionStartTime) / 1000); // in seconds
    
    const event = {
      type: 'session_end',
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      sessionDuration, // in seconds
      pagesViewed: this.pageViewCount,
      device: this.getDeviceInfo(),
    };

    // Send event normally (Supabase or localStorage)
    this.sendEvent(event);
  }

  /**
   * Track custom event
   */
  trackEvent(eventName, properties = {}) {
    const event = {
      type: 'custom_event',
      eventName,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      properties,
      device: this.getDeviceInfo(),
    };

    this.sendEvent(event);
    return event;
  }

  /**
   * Send event to Supabase or store locally
   */
  async sendEvent(event) {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[Analytics]', event);
    }

    // Send to Supabase if configured
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('analytics_events')
          .insert([{
            event_type: event.type,
            session_id: event.sessionId,
            timestamp: event.timestamp,
            page_path: event.page?.path || null,
            page_title: event.page?.title || null,
            page_url: event.page?.url || null,
            referrer: event.referrer || null,
            device_type: event.device?.deviceType || null,
            browser: event.device?.browser || null,
            screen_width: event.device?.screenWidth || null,
            screen_height: event.device?.screenHeight || null,
            viewport: event.device?.viewport || null,
            session_duration: event.sessionDuration || null,
            pages_in_session: event.pagesInSession || event.pagesViewed || null,
            event_name: event.eventName || null,
            properties: event.properties || null,
          }]);

        if (error) {
          console.error('[Analytics] Supabase error:', error);
          // Fall back to localStorage on error
          this.storeEventLocally(event);
        }
      } catch (error) {
        console.error('[Analytics] Failed to send to Supabase:', error);
        // Fall back to localStorage on error
        this.storeEventLocally(event);
      }
    } else {
      // Store in localStorage if Supabase not configured (dev/testing)
      this.storeEventLocally(event);
    }
  }

  /**
   * Store event in localStorage for testing
   */
  storeEventLocally(event) {
    try {
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      events.push(event);
      
      // Keep only last 100 events to avoid storage issues
      if (events.length > 100) {
        events.shift();
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (e) {
      // Storage full or disabled
      console.warn('[Analytics] Could not store event locally:', e);
    }
  }

  /**
   * Initialize tracking listeners
   */
  initializeTracking() {
    // Track initial page view
    this.trackPageView();

    // Track page unload (session end)
    window.addEventListener('beforeunload', () => {
      this.trackSessionEnd();
    });

    // Track visibility changes (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // User switched tab or minimized
        this.trackEvent('visibility_hidden');
      }
    });

    // Track window resize (useful for responsive design analytics)
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.trackEvent('window_resize', {
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        });
      }, 500);
    });
  }

  /**
   * Get all stored events (for debugging)
   */
  getStoredEvents() {
    try {
      return JSON.parse(localStorage.getItem('analytics_events') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * Clear stored events
   */
  clearStoredEvents() {
    localStorage.removeItem('analytics_events');
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const duration = Math.round((Date.now() - this.sessionStartTime) / 1000);
    return {
      sessionId: this.sessionId,
      duration: duration,
      pageViews: this.pageViewCount,
      device: this.getDeviceInfo(),
      referrer: this.getReferrer(),
    };
  }
}

// Create singleton instance
const analytics = new Analytics();

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  window.__analytics = analytics;
}

export default analytics;

