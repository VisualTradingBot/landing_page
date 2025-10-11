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
    this.isInitialized = false;
    this.eventQueue = [];
    
    // Initialize Supabase client if configured, then start tracking
    this.initialize();
  }

  /**
   * Initialize analytics (async wrapper for constructor)
   */
  async initialize() {
    // Initialize Supabase first
    await this.initializeSupabase();
    this.isInitialized = true;
    
    // Process any queued events
    await this.processEventQueue();
    
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
        
        if (this.supabase) {
          console.log('[Analytics] ✅ Supabase connected successfully');
        }
      } catch (error) {
        console.warn('[Analytics] Supabase not available. Install with: npm install @supabase/supabase-js');
        console.warn('[Analytics] Falling back to localStorage only');
      }
    } else {
      console.warn('[Analytics] ⚠️ Supabase not configured - missing environment variables');
      console.warn('[Analytics] Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment');
      console.log('[Analytics] 📦 Using localStorage only');
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
    if (!referrer) {
      // Check for UTM parameters as backup
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('utm_source');
      if (utmSource) return `utm:${utmSource}`;
      return 'direct';
    }
    
    try {
      const referrerUrl = new URL(referrer);
      const currentUrl = new URL(window.location.href);
      
      // If same domain, it's internal navigation
      if (referrerUrl.hostname === currentUrl.hostname) {
        return 'internal';
      }
      
      const hostname = referrerUrl.hostname.toLowerCase();
      
      // Detect social media platforms specifically
      // Instagram often uses l.instagram.com (link wrapper) or lm.instagram.com (mobile)
      if (hostname.includes('instagram.com')) return 'instagram.com';
      if (hostname.includes('facebook.com') || hostname.includes('fb.com')) return 'facebook.com';
      if (hostname.includes('twitter.com') || hostname.includes('t.co')) return 'twitter.com';
      if (hostname.includes('x.com')) return 'x.com';
      if (hostname.includes('tiktok.com')) return 'tiktok.com';
      if (hostname.includes('linkedin.com') || hostname.includes('lnkd.in')) return 'linkedin.com';
      if (hostname.includes('reddit.com')) return 'reddit.com';
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube.com';
      if (hostname.includes('pinterest.com')) return 'pinterest.com';
      
      // Return just the domain, not full URL (for privacy)
      return hostname;
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

    // Use sendBeacon for critical events that might happen before navigation
    const isCriticalEvent = eventName === 'click' && properties.element?.includes('social');
    
    // Log social media clicks specifically for debugging
    if (isCriticalEvent) {
      console.log(`[Analytics] 🎯 Social click tracked: ${properties.element}`, event);
    }
    
    if (isCriticalEvent && !import.meta.env.DEV) {
      this.sendEventWithBeacon(event);
    } else {
      this.sendEvent(event);
    }
    
    return event;
  }

  /**
   * Process queued events after initialization
   */
  async processEventQueue() {
    if (this.eventQueue.length > 0) {
      console.log(`[Analytics] Processing ${this.eventQueue.length} queued events`);
      for (const event of this.eventQueue) {
        await this.sendEventToSupabase(event);
      }
      this.eventQueue = [];
    }
  }

  /**
   * Send event to Supabase or store locally
   */
  async sendEvent(event) {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[Analytics] [DEV MODE - Not sending to Supabase]', event);
      // Only store locally in dev mode, don't send to Supabase
      this.storeEventLocally(event);
      return;
    }

    // If not initialized yet, queue the event
    if (!this.isInitialized) {
      this.eventQueue.push(event);
      return;
    }

    await this.sendEventToSupabase(event);
  }

  /**
   * Actually send event to Supabase
   */
  async sendEventToSupabase(event) {

    // Send to Supabase only in production
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
        } else {
          console.log(`[Analytics] ✅ Event sent to Supabase: ${event.type}`, event.eventName || '');
        }
      } catch (error) {
        console.error('[Analytics] Failed to send to Supabase:', error);
        // Fall back to localStorage on error
        this.storeEventLocally(event);
      }
    } else {
      console.warn('[Analytics] ⚠️ Supabase not available, storing locally');
      // Store in localStorage if Supabase not configured
      this.storeEventLocally(event);
    }
  }

  /**
   * Send event using navigator.sendBeacon for events that happen before navigation
   * This ensures the event is sent even if the page unloads
   */
  sendEventWithBeacon(event) {
    if (!this.supabase || !this.isInitialized) {
      console.warn('[Analytics] ⚠️ Supabase not ready, cannot use sendBeacon');
      this.storeEventLocally(event);
      return;
    }

    try {
      // Create the payload for Supabase
      const payload = {
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
      };

      // Get Supabase URL and key
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
      }

      // Use Supabase REST API with sendBeacon
      const url = `${supabaseUrl}/rest/v1/analytics_events`;
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      
      const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      };

      // Note: sendBeacon doesn't support custom headers well, so we'll use fetch with keepalive instead
      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        keepalive: true, // This is the key - sends even after page unload
      }).then(() => {
        console.log(`[Analytics] ✅ Critical event sent (keepalive): ${event.type}`, event.eventName || '');
      }).catch((error) => {
        console.error('[Analytics] Failed to send critical event:', error);
        this.storeEventLocally(event);
      });

    } catch (error) {
      console.error('[Analytics] sendBeacon failed:', error);
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

    // Track scroll depth milestones
    this.initializeScrollTracking();

    // Note: Removed window resize and visibility tracking to reduce database clutter
    // These events created too much noise without actionable insights
  }

  /**
   * Initialize scroll depth tracking
   * Tracks when users scroll to 25%, 50%, 75%, and 100% of the page
   */
  initializeScrollTracking() {
    const milestones = [25, 50, 75, 100];
    const reached = new Set();
    
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = window.scrollY;
        const scrollPercent = Math.round((scrolled / scrollHeight) * 100);
        
        // Check each milestone
        milestones.forEach(milestone => {
          if (scrollPercent >= milestone && !reached.has(milestone)) {
            reached.add(milestone);
            this.trackEvent('scroll_depth', {
              depth: milestone,
              reached_at: new Date().toISOString(),
            });
            
            if (import.meta.env.DEV) {
              console.log(`[Analytics] 📜 Scroll depth: ${milestone}%`);
            }
          }
        });
      }, 200); // Debounce scroll events
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
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

