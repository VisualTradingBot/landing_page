import { useState } from "react";
import "./faq.scss";

export default function FAQ() {
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const faqData = [
    {
      question: "How does CRYPTIQ's visual programming work?",
      answer:
        "CRYPTIQ uses a drag-and-drop interface where you can connect trading components visually. No coding required - just drag indicators, conditions, and actions to create sophisticated trading strategies.",
    },
    {
      question: "Can I backtest my strategies before deploying?",
      answer:
        "Yes! CRYPTIQ includes comprehensive backtesting tools that let you test your strategies against historical data. You can see performance metrics, drawdowns, and optimize your parameters before going live.",
    },
    {
      question: "Which exchanges does CRYPTIQ support?",
      answer:
        "CRYPTIQ connects to major exchanges including Binance, Coinbase Pro, Kraken, and many others. We're constantly adding new exchange integrations to expand your trading opportunities.",
    },
    {
      question: "Is there a paper trading mode?",
      answer:
        "Absolutely. CRYPTIQ includes a paper trading feature that lets you simulate live markets without risking real capital. Perfect for testing new strategies and building confidence.",
    },
    {
      question: "How secure is my trading data?",
      answer:
        "Security is our top priority. We use bank-level encryption, secure API keys with limited permissions, and never store your actual trading credentials. Your data is encrypted both in transit and at rest.",
    },
    {
      question: "Can I create custom indicators?",
      answer:
        "Yes! CRYPTIQ's visual editor allows you to create custom technical indicators by combining existing components. You can also import indicators from the community marketplace.",
    },
  ];

  return (
    <section id="faq" className="faq">
      <div className="divider"></div>
      <div className="container">
        <h2>FAQ</h2>
        <p className="sub">
          Frequently asked questions about CRYPTIQ&#39;s visual trading
          platform.
        </p>

        <div className="faq-items">
          {faqData.map((item, index) => (
            <div
              key={index}
              className={`faq-item ${openItems.has(index) ? "open" : ""}`}
            >
              <button
                className="faq-question"
                onClick={() => toggleItem(index)}
              >
                <span>{item.question}</span>
                <span className="faq-icon">
                  {openItems.has(index) ? "−" : "+"}
                </span>
              </button>
              {openItems.has(index) && (
                <div className="faq-answer">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="divider"></div>
    </section>
  );
}
