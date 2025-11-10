import { useTrackInteraction } from "../../../hooks/useAnalytics";
import "./cta.scss";
import PropTypes from "prop-types";

export default function CTA({ onOpenModal }) {
  const { trackClick } = useTrackInteraction();

  return (
    <section id="cta" className="cta">
      <div className="container">
        <h2>Interested in CRYPTIQ?</h2>
        <p className="sub">
          Help us shape the future of visual trading. Leave your contact details
          to participate in our questionnaires and be notified when CRYPTIQ is
          deployed.
        </p>
        <button
          className="contact-btn"
          onClick={() => {
            trackClick("cta-get-in-touch");
            onOpenModal();
          }}
        >
          Get In Touch
        </button>
      </div>
    </section>
  );
}

CTA.propTypes = {
  onOpenModal: PropTypes.func.isRequired,
};
