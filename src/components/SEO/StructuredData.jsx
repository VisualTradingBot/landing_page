import { useEffect } from "react";

export default function StructuredData() {
  useEffect(() => {
    const baseUrl = window.location.origin;
    
    // Website schema with mainEntity for sitelinks
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "CRYPTIQ",
      "url": baseUrl,
      "description": "Visual trading automation platform for building, testing, and deploying crypto trading strategies",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${baseUrl}/?search={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      },
      "mainEntity": [
        {
          "@type": "WebPage",
          "@id": `${baseUrl}/#build`,
          "name": "Build",
          "description": "Create sophisticated trading algorithms with visual drag-and-drop interface",
          "url": `${baseUrl}/#build`
        },
        {
          "@type": "WebPage",
          "@id": `${baseUrl}/#test`,
          "name": "Test",
          "description": "Backtest, simulate and deploy to exchanges securely",
          "url": `${baseUrl}/#test`
        },
        {
          "@type": "WebPage",
          "@id": `${baseUrl}/#trade`,
          "name": "Trade",
          "description": "Professional trading tools that work across all major cryptocurrency exchanges",
          "url": `${baseUrl}/#trade`
        },
        {
          "@type": "WebPage",
          "@id": `${baseUrl}/#demo`,
          "name": "Demo",
          "description": "Try our interactive demo to build and test trading strategies",
          "url": `${baseUrl}/#demo`
        },
        {
          "@type": "WebPage",
          "@id": `${baseUrl}/#faq`,
          "name": "FAQ",
          "description": "Frequently asked questions about CRYPTIQ platform",
          "url": `${baseUrl}/#faq`
        }
      ]
    };

    // Organization schema
    // Note: Google prefers square logos (multiples of 48px: 112x112, 512x512, etc.)
    // Currently using og-image.png as fallback. Consider creating a square logo.png for best results.
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "CRYPTIQ",
      "url": baseUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/og-image.png`,
        
      },
      "image": `${baseUrl}/og-image.png`,
      "description": "New generation platform for visual trading automation",
      "sameAs": [
        // Add social media URLs here when available
      ]
    };

    // SoftwareApplication schema
    const softwareSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "CRYPTIQ",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "description": "Visual trading automation platform for cryptocurrency. Build, test, and deploy trading strategies without coding.",
      "featureList": [
        "Visual drag-and-drop strategy builder",
        "Historical backtesting",
        "Paper trading simulation",
        "Live trading deployment",
        "Multi-exchange support"
      ]
    };

    // BreadcrumbList schema
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": baseUrl
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Build",
          "item": `${baseUrl}/#build`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Test",
          "item": `${baseUrl}/#test`
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Trade",
          "item": `${baseUrl}/#trade`
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "Demo",
          "item": `${baseUrl}/#demo`
        }
      ]
    };

    // Inject all schemas into the page
    const schemas = [websiteSchema, organizationSchema, softwareSchema, breadcrumbSchema];
    
    schemas.forEach((schema, index) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = `structured-data-${index}`;
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    // Cleanup function
    return () => {
      schemas.forEach((_, index) => {
        const script = document.getElementById(`structured-data-${index}`);
        if (script) {
          script.remove();
        }
      });
    };
  }, []);

  return null;
}

