/**
 * Demo Analytics Utility
 * Tracks user interactions within the demo section
 * Tracks button clicks, time spent, tutorial progress, and more
 * Writes to demo_analytics_events table (separate from general analytics_events)
 */

import { getSupabaseClient, isSupabaseConfigured } from "./supabase.js";

class DemoAnalytics {
  constructor() {
    this.demoStartTime = null;
    this.isInDemo = false;
    this.buttonClickCounts = new Map(); // Track button clicks
    this.supabase = null;
    this.isInitialized = false;
    this.eventQueue = [];
    this.demoInteractions = {
      buttonsClicked: 0,
      nodesInteracted: 0,
      parametersModified: 0,
      backtestsRun: 0,
      tutorialStarted: false,
      tutorialCompleted: false,
      tutorialSkipped: false,
      tutorialStepsCompleted: 0,
    };

    // Initialize Supabase client if configured
    this.initialize();
  }

  /**
   * Initialize Supabase client
   */
  async initialize() {
    await this.initializeSupabase();
    this.isInitialized = true;
    await this.processEventQueue();
  }

  /**
   * Initialize Supabase client for demo analytics
   */
  async initializeSupabase() {
    if (isSupabaseConfigured()) {
      try {
        this.supabase = await getSupabaseClient();
        if (this.supabase) {
          console.log("[DemoAnalytics] ✅ Supabase connected successfully");
        }
      } catch (error) {
        console.warn("[DemoAnalytics] Supabase not available:", error);
        console.warn("[DemoAnalytics] Falling back to localStorage only");
      }
    } else {
      console.warn("[DemoAnalytics] ⚠️ Supabase not configured");
      console.log("[DemoAnalytics] 📦 Using localStorage only");
    }
  }

  /**
   * Process queued events after initialization
   */
  async processEventQueue() {
    if (this.eventQueue.length > 0) {
      console.log(`[DemoAnalytics] Processing ${this.eventQueue.length} queued events`);
      for (const event of this.eventQueue) {
        await this.sendEventToSupabase(event);
      }
      this.eventQueue = [];
    }
  }

  /**
   * Get session ID (same as analytics.js)
   */
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem("analytics_session_id");
    if (!sessionId) {
      sessionId =
        "sess_" + Math.random().toString(36).substr(2, 9) + Date.now();
      sessionStorage.setItem("analytics_session_id", sessionId);
    }
    return sessionId;
  }

  /**
   * Get device information (same as analytics.js)
   */
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = "desktop";

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      deviceType = "tablet";
    } else if (
      /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
        ua
      )
    ) {
      deviceType = "mobile";
    }

    let browser = "Unknown";
    if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome/")) browser = "Chrome";
    else if (ua.includes("Safari/") && !ua.includes("Chrome"))
      browser = "Safari";
    else if (ua.includes("Opera") || ua.includes("OPR/")) browser = "Opera";

    return {
      deviceType,
      browser,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  /**
   * Send event to Supabase (to demo_analytics_events table)
   * Uses optimized structure for demo-specific analytics
   */
  async sendEventToSupabase(event) {
    if (this.supabase) {
      try {
        // Extract demo-specific fields from properties
        const props = event.properties || {};
        
        // Build the optimized record structure
        const record = {
          session_id: event.sessionId,
          timestamp: event.timestamp,
          demo_session_start: this.demoStartTime ? new Date(this.demoStartTime).toISOString() : null,
          event_name: event.eventName || null,
          device_type: event.device?.deviceType || null,
          screen_width: event.device?.screenWidth || null,
          screen_height: event.device?.screenHeight || null,
          
          // Button-specific fields
          button_name: props.button_name || null,
          click_count: props.click_count || null,
          
          // Tutorial-specific fields
          tutorial_step_number: props.step_number || null,
          tutorial_step_title: props.step_title || null,
          tutorial_action: props.tutorial_action || null,
          
          // Node-specific fields
          node_id: props.node_id || props.source_id || null,
          node_type: props.node_type || props.source_type || null,
          node_action: props.node_action || null,
          connected_to_node_id: props.target_id || null,
          connected_to_node_type: props.target_type || null,
          
          // Parameter-specific fields
          parameter_label: props.parameter_label || null,
          parameter_action: props.parameter_action || null,
          
          // Backtest-specific fields
          backtest_duration_seconds: props.duration_seconds || null,
          backtest_action: props.backtest_action || null,
          
          // Dataset-specific fields
          dataset_field: props.field || null,
          dataset_old_value: props.old_value || null,
          dataset_new_value: props.new_value || null,
          
          // In-trade block
          in_trade_block_expanded: props.is_expanded !== undefined ? props.is_expanded : null,
          
          // Info button
          info_button_context: props.context || null,
          
          // Session summary (only for demo_end event)
          time_spent_seconds: props.time_spent_seconds || null,
          time_spent_minutes: props.time_spent_minutes || null,
          total_buttons_clicked: props.buttons_clicked || null,
          total_nodes_interacted: props.nodes_interacted || null,
          total_parameters_modified: props.parameters_modified || null,
          total_backtests_run: props.backtests_run || null,
          tutorial_started: props.tutorial_started || null,
          tutorial_completed: props.tutorial_completed || null,
          tutorial_skipped: props.tutorial_skipped || null,
          tutorial_steps_completed: props.tutorial_steps_completed || null,
          button_breakdown: props.button_breakdown || null,
          
          // Flexible properties for any additional data
          properties: event.properties || null,
        };

        const { error } = await this.supabase.from("demo_analytics_events").insert([record]);

        if (error) {
          console.error("[DemoAnalytics] Supabase error:", error);
          this.storeEventLocally(event);
        } else if (!import.meta.env.DEV) {
          console.log(
            `[DemoAnalytics] ✅ Event sent: ${event.eventName || event.type}`,
            event.eventName || ""
          );
        }
      } catch (error) {
        console.error("[DemoAnalytics] Failed to send to Supabase:", error);
        this.storeEventLocally(event);
      }
    } else {
      this.storeEventLocally(event);
    }
  }

  /**
   * Store event in localStorage for testing
   */
  storeEventLocally(event) {
    try {
      const events = JSON.parse(
        localStorage.getItem("demo_analytics_events") || "[]"
      );
      events.push(event);

      // Keep only last 100 events
      if (events.length > 100) {
        events.shift();
      }

      localStorage.setItem("demo_analytics_events", JSON.stringify(events));
    } catch (e) {
      console.warn("[DemoAnalytics] Could not store event locally:", e);
    }
  }

  /**
   * Send event to Supabase or queue it
   */
  async sendEvent(event) {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.log("[DemoAnalytics] [DEV MODE - Not sending to Supabase]", event);
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
   * Track when user enters the demo section
   */
  trackDemoStart() {
    if (this.isInDemo) return; // Already tracking
    
    this.demoStartTime = Date.now();
    this.isInDemo = true;
    this.resetInteractionCounts();

    const event = {
      type: "custom_event",
      eventName: "demo_start",
      sessionId: this.getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
      properties: {},
      device: this.getDeviceInfo(),
    };

    this.sendEvent(event);
  }

  /**
   * Track when user leaves the demo section
   */
  trackDemoEnd() {
    if (!this.isInDemo || !this.demoStartTime) return;

    const timeSpent = Math.round((Date.now() - this.demoStartTime) / 1000); // in seconds

    const event = {
      type: "custom_event",
      eventName: "demo_end",
      sessionId: this.getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
      properties: {
        time_spent_seconds: timeSpent,
        time_spent_minutes: Math.round((timeSpent / 60) * 100) / 100,
        buttons_clicked: this.demoInteractions.buttonsClicked,
        nodes_interacted: this.demoInteractions.nodesInteracted,
        parameters_modified: this.demoInteractions.parametersModified,
        backtests_run: this.demoInteractions.backtestsRun,
        tutorial_started: this.demoInteractions.tutorialStarted,
        tutorial_completed: this.demoInteractions.tutorialCompleted,
        tutorial_skipped: this.demoInteractions.tutorialSkipped,
        tutorial_steps_completed: this.demoInteractions.tutorialStepsCompleted,
        button_breakdown: Object.fromEntries(this.buttonClickCounts),
        timestamp: new Date().toISOString(),
      },
      device: this.getDeviceInfo(),
    };

    this.sendEvent(event);

    this.isInDemo = false;
    this.demoStartTime = null;
  }

  /**
   * Track button click
   */
  trackButtonClick(buttonName, additionalProps = {}) {
    const currentCount = this.buttonClickCounts.get(buttonName) || 0;
    this.buttonClickCounts.set(buttonName, currentCount + 1);
    this.demoInteractions.buttonsClicked++;

    const event = {
      type: "custom_event",
      eventName: "demo_button_click",
      sessionId: this.getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
      properties: {
        button_name: buttonName,
        click_count: currentCount + 1,
        ...additionalProps,
        timestamp: new Date().toISOString(),
      },
      device: this.getDeviceInfo(),
    };

    this.sendEvent(event);
  }

  /**
   * Track tutorial events
   */
  trackTutorialStart() {
    this.demoInteractions.tutorialStarted = true;
    const event = {
      type: "custom_event",
      eventName: "demo_button_click",
      sessionId: this.getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
      properties: {
        button_name: "tutorial_start",
        tutorial_action: "start",
        click_count: 1,
      },
      device: this.getDeviceInfo(),
    };
    this.trackButtonClick("tutorial_start", { tutorial_action: "start" });
  }

  trackTutorialStep(stepNumber, stepTitle) {
    this.demoInteractions.tutorialStepsCompleted = Math.max(
      this.demoInteractions.tutorialStepsCompleted,
      stepNumber + 1
    );

    const event = {
      type: "custom_event",
      eventName: "demo_tutorial_step",
      sessionId: this.getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
      properties: {
        step_number: stepNumber,
        step_title: stepTitle,
        tutorial_action: "step",
        total_steps: 7,
      },
      device: this.getDeviceInfo(),
    };

    this.sendEvent(event);
  }

  trackTutorialComplete() {
    this.demoInteractions.tutorialCompleted = true;
    this.trackButtonClick("tutorial_complete", { tutorial_action: "complete" });
  }

  trackTutorialSkip() {
    this.demoInteractions.tutorialSkipped = true;
    this.trackButtonClick("tutorial_skip", { tutorial_action: "skip" });
  }

  /**
   * Track node interactions
   */
  trackNodeDrag(nodeId, nodeType) {
    this.demoInteractions.nodesInteracted++;

    const event = {
      type: "custom_event",
      eventName: "demo_node_drag",
      sessionId: this.getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
      properties: {
        node_id: nodeId,
        node_type: nodeType,
        node_action: "drag",
      },
      device: this.getDeviceInfo(),
    };

    this.sendEvent(event);
  }

  trackNodeConnect(sourceId, targetId, sourceType, targetType) {
    const event = {
      type: "custom_event",
      eventName: "demo_node_connect",
      sessionId: this.getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
      properties: {
        node_id: sourceId,
        node_type: sourceType,
        node_action: "connect",
        target_id: targetId,
        target_type: targetType,
        // Also store as source_* for backward compatibility
        source_id: sourceId,
        source_type: sourceType,
      },
      device: this.getDeviceInfo(),
    };

    this.sendEvent(event);
  }

  /**
   * Track parameter interactions
   */
  trackParameterAdd(parameterLabel) {
    this.demoInteractions.parametersModified++;
    this.trackButtonClick("parameter_add", { 
      parameter_label: parameterLabel,
      parameter_action: "add",
    });
  }

  trackParameterEdit(parameterLabel) {
    this.demoInteractions.parametersModified++;
    this.trackButtonClick("parameter_edit", { 
      parameter_label: parameterLabel,
      parameter_action: "edit",
    });
  }

  trackParameterDelete(parameterLabel) {
    this.demoInteractions.parametersModified++;
    this.trackButtonClick("parameter_delete", { 
      parameter_label: parameterLabel,
      parameter_action: "delete",
    });
  }

  trackParameterDashboardToggle(isExpanded) {
    this.trackButtonClick("parameter_dashboard_toggle", {
      is_expanded: isExpanded,
      parameter_action: "toggle_dashboard",
    });
  }

  /**
   * Track backtest interactions
   */
  trackBacktestRun() {
    this.demoInteractions.backtestsRun++;
    this.trackButtonClick("run_backtest", { backtest_action: "run" });
  }

  trackBacktestComplete(duration) {
    const event = {
      type: "custom_event",
      eventName: "demo_backtest_complete",
      sessionId: this.getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
      properties: {
        duration_seconds: duration,
        backtest_action: "complete",
      },
      device: this.getDeviceInfo(),
    };

    this.sendEvent(event);
  }

  /**
   * Track in-trade block interactions
   */
  trackInTradeBlockToggle(isExpanded) {
    this.trackButtonClick("in_trade_block_toggle", {
      is_expanded: isExpanded,
      in_trade_block_expanded: isExpanded,
    });
  }

  /**
   * Track info button clicks
   */
  trackInfoButtonClick(context) {
    this.trackButtonClick("info_button", { context });
  }

  /**
   * Track dataset sidebar changes
   */
  trackDatasetChange(field, oldValue, newValue) {
    const event = {
      type: "custom_event",
      eventName: "demo_dataset_change",
      sessionId: this.getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
      properties: {
        field,
        old_value: oldValue,
        new_value: newValue,
        timestamp: new Date().toISOString(),
      },
      device: this.getDeviceInfo(),
    };

    this.sendEvent(event);
  }

  /**
   * Reset interaction counts (for new demo session)
   */
  resetInteractionCounts() {
    this.buttonClickCounts.clear();
    this.demoInteractions = {
      buttonsClicked: 0,
      nodesInteracted: 0,
      parametersModified: 0,
      backtestsRun: 0,
      tutorialStarted: false,
      tutorialCompleted: false,
      tutorialSkipped: false,
      tutorialStepsCompleted: 0,
    };
  }

  /**
   * Get current demo session stats
   */
  getCurrentStats() {
    if (!this.isInDemo || !this.demoStartTime) {
      return null;
    }

    const timeSpent = Math.round((Date.now() - this.demoStartTime) / 1000);

    return {
      timeSpentSeconds: timeSpent,
      timeSpentMinutes: Math.round((timeSpent / 60) * 100) / 100,
      interactions: { ...this.demoInteractions },
      buttonCounts: Object.fromEntries(this.buttonClickCounts),
    };
  }
}

// Create singleton instance
const demoAnalytics = new DemoAnalytics();

// Expose for debugging
if (typeof window !== "undefined") {
  window.__demoAnalytics = demoAnalytics;
}

export default demoAnalytics;

