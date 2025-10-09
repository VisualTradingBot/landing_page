import { useEffect, useRef } from 'react';
import analytics from '../utils/analytics';

/**
 * React hook for tracking page views and events
 * @param {string} pageName - Optional page name for tracking
 */
export const useAnalytics = (pageName = null) => {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Track page view only once per mount
    if (!hasTracked.current && pageName) {
      analytics.trackPageView(pageName);
      hasTracked.current = true;
    }
  }, [pageName]);

  return {
    trackEvent: analytics.trackEvent.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    getSessionSummary: analytics.getSessionSummary.bind(analytics),
  };
};

/**
 * Hook to track specific user interactions
 */
export const useTrackInteraction = () => {
  const trackClick = (elementName, additionalData = {}) => {
    analytics.trackEvent('click', {
      element: elementName,
      ...additionalData,
    });
  };

  const trackFormSubmit = (formName, success = true) => {
    analytics.trackEvent('form_submit', {
      form: formName,
      success,
    });
  };

  const trackScroll = (scrollDepth) => {
    analytics.trackEvent('scroll', {
      depth: scrollDepth,
    });
  };

  return {
    trackClick,
    trackFormSubmit,
    trackScroll,
  };
};

export default useAnalytics;



