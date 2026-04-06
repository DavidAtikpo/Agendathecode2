// Structured Data (JSON-LD) for SEO
export const generateStructuredData = () => {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://agenda.example.com/#organization",
        "name": "Agenda",
        "url": "https://agenda.example.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://agenda.example.com/logo (1).jpg",
          "width": 512,
          "height": 512,
        },
        "description": "Plateforme de gestion de tâches et d'idées avec l'aide de l'IA",
        "sameAs": [
          "https://twitter.com/agenda",
          "https://linkedin.com/company/agenda",
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+33-1-XX-XX-XX-XX",
          "contactType": "Customer Support",
          "language": "fr",
        },
      },
      {
        "@type": "WebSite",
        "@id": "https://agenda.example.com/#website",
        "url": "https://agenda.example.com",
        "name": "Agenda — Idées & Tâches",
        "description": "Capturez vos idées et gérez vos tâches en équipe avec l'aide de l'IA",
        "publisher": {
          "@id": "https://agenda.example.com/#organization",
        },
        "inLanguage": "fr-FR",
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://agenda.example.com/?search={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://agenda.example.com/#app",
        "name": "Agenda",
        "applicationCategory": "ProductivityApplication",
        "operatingSystem": "Web",
        "url": "https://agenda.example.com",
        "description": "Application web de gestion de tâches et d'idées avec l'IA",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR",
          "category": "Free Plan",
        },
        "image": "https://agenda.example.com/logo (1).jpg",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5",
          "ratingCount": "1",
        },
      },
    ],
  };
};
