import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./contactModal.scss";

const STATIC_RECIPIENT_EMAIL = "giancarlofranceschetti1202@gmail.com";

const INITIAL_FORM_STATE = {
  name: "",
  email: "",
  tradingExperience: "beginner", // beginner, intermediate, advanced
  botExperience: "beginner", // beginner, intermediate, advanced
};

export default function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // "success" | "error"
  const [submitMessage, setSubmitMessage] = useState("");

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
            }\\nBot experience: ${formData.botExperience}`,
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
      } else {
        throw new Error(data.message || "Unable to send message.");
      }
    } catch (error) {
      console.error("Contact form submission failed:", error);
      setSubmitStatus("error");
      setSubmitMessage(
        "We couldn't send your message right now. Please try again in a moment."
      );
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
    }
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
          <button className="close-button" onClick={onClose}>
            ×
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
