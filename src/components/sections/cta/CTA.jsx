import React from "react";
import "./cta.scss";

export default function CTA({ onOpenModal }) {
  return (
    <section id="cta" className="cta">
      <div className="container">
        <h2>Interested in VTrade?</h2>
        <p className="sub">
          Help us shape the future of visual trading. Leave your contact details to participate in our questionnaires and be notified when VTrade is deployed.
        </p>
        <button className="contact-btn" onClick={onOpenModal}>
          Get In Touch
        </button>
      </div>
    </section>
  );
}
