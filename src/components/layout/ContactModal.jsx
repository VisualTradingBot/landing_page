import { useState } from "react";
import { motion } from "framer-motion";
import "./contactModal.scss";

export default function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    tradingExperience: "beginner", // beginner, intermediate, advanced
    botExperience: "beginner", // beginner, intermediate, advanced
  });

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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log("Form submitted:", formData);
    onClose();
  };

  const experienceLevels = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ];

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
            <label>Trading Experience (Optional)</label>
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
            <label>Trading Bot Experience (Optional)</label>
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

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Send Message
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
