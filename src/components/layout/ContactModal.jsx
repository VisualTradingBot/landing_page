import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTrackInteraction } from "../../hooks/useAnalytics";
import { getSupabaseClient } from "../../utils/supabase";
import "./contactModal.scss";
import PropTypes from "prop-types";

const STATIC_RECIPIENT_EMAIL = "giancarlofranceschetti1202@gmail.com";
const ADDITIONAL_RECIPIENT_EMAIL = "valerii.f@cryptiq.trade";

const INITIAL_FORM_STATE = {
  name: "",
  email: "",
  question: "",
  tradingExperience: "beginner", // beginner, intermediate, advanced
  botExperience: "beginner", // beginner, intermediate, advanced
};

export default function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // "success" | "error"
  const [submitMessage, setSubmitMessage] = useState("");

  // Analytics tracking
  const { trackClick, trackFormSubmit } = useTrackInteraction();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExperienceChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMessage("");

    try {
      // Get analytics context for enriched data
      const sessionContext = window.__analytics
        ? window.__analytics.getSessionSummary()
        : {};

      // 1. Save to Supabase database (only in production)
      if (!import.meta.env.DEV) {
        const supabase = await getSupabaseClient();
        if (supabase) {
          try {
            const { error: supabaseError } = await supabase
              .from("contact_submissions")
              .insert([
                {
                  name: formData.name || null,
                  email: formData.email,
                  question: formData.question || null,
                  trading_experience: formData.tradingExperience,
                  bot_experience: formData.botExperience,
                  session_id: sessionContext.sessionId || null,
                  referrer: sessionContext.referrer || null,
                  device_type: sessionContext.device?.deviceType || null,
                  browser: sessionContext.device?.browser || null,
                },
              ]);

            if (supabaseError) {
              console.error("Supabase save error:", supabaseError);
              // Continue to email anyway - don't fail the whole submission
            } else {
              console.log("✅ Submission saved to Supabase database");
            }
          } catch (supabaseException) {
            console.error("Supabase exception:", supabaseException);
            // Continue to email anyway
          }
        }
      } else {
        console.log(
          "[DEV MODE] Contact form submission - not saving to Supabase"
        );
      }

      // 2. Send email notification via FormSubmit (existing functionality)
      const response = await fetch(
        `https://formsubmit.co/ajax/${STATIC_RECIPIENT_EMAIL}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            ...formData,
            subject: "New contact form submission",
            message: `Contact request from ${
              formData.name || "Anonymous"
            }\\n\\nEmail: ${formData.email}\\nTrading experience: ${
              formData.tradingExperience
            }\\nBot experience: ${formData.botExperience}${
              formData.question ? `\\n\\nQuestion/Comment: ${formData.question}` : ""
            }`,
            _cc: ADDITIONAL_RECIPIENT_EMAIL, // Send copy to second email
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.success === "true") {
        setSubmitStatus("success");
        setSubmitMessage(
          "Thanks! We received your message and will reply soon."
        );
        setFormData(INITIAL_FORM_STATE);

        // Track successful form submission
        trackFormSubmit("contact-form", true);
      } else {
        throw new Error(data.message || "Unable to send message.");
      }
    } catch (error) {
      console.error("Contact form submission failed:", error);
      setSubmitStatus("error");
      setSubmitMessage(
        "We couldn't send your message right now. Please try again in a moment."
      );

      // Track failed form submission
      trackFormSubmit("contact-form", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const experienceLevels = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ];

  useEffect(() => {
    if (!isOpen) {
      setFormData(INITIAL_FORM_STATE);
      setSubmitStatus(null);
      setSubmitMessage("");
      setIsSubmitting(false);
    } else {
      // Track modal open
      trackClick("contact-modal-open");
    }
  }, [isOpen, trackClick]);

  // Lock/unlock body scroll when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Lock body scroll
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      // Restore body scroll
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    // Cleanup function
    return () => {
      if (isOpen) {
        const scrollY = document.body.style.top;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || "0") * -1);
        }
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Get in Touch</h2>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            <span className="hamburger active">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Name (Optional)</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Your name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Trading Experience</label>
            <div className="toggle-group">
              {experienceLevels.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  className={`toggle-button ${
                    formData.tradingExperience === level.value ? "active" : ""
                  }`}
                  onClick={() =>
                    handleExperienceChange("tradingExperience", level.value)
                  }
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Trading Bot Experience</label>
            <div className="toggle-group">
              {experienceLevels.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  className={`toggle-button ${
                    formData.botExperience === level.value ? "active" : ""
                  }`}
                  onClick={() =>
                    handleExperienceChange("botExperience", level.value)
                  }
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="question">Question/Comment (Optional)</label>
            <textarea
              id="question"
              name="question"
              value={formData.question}
              onChange={handleInputChange}
              placeholder="Your question or comment..."
              rows={4}
            />
          </div>

          {submitStatus && (
            <div
              className={`submission-message ${submitStatus}`}
              role={submitStatus === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {submitMessage}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Sending…" : "Send Message"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

ContactModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
