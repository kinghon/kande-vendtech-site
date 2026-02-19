export function JsonLd() {
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://kandevendtech.com/#localbusiness",
    name: "Kande VendTech",
    description:
      "Premier AI-powered smart vending machine services in Las Vegas. Free installation, restocking, and maintenance for hotels, offices, apartments, and gyms.",
    url: "https://kandevendtech.com",
    telephone: "(725) 228-8822",
    email: "hello@kandevendtech.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Las Vegas",
      addressRegion: "NV",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 36.1699,
      longitude: -115.1398,
    },
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 36.1699,
        longitude: -115.1398,
      },
      geoRadius: "50000",
    },
    serviceArea: {
      "@type": "Place",
      name: "Las Vegas Valley",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Las Vegas",
        addressRegion: "NV",
        addressCountry: "US",
      },
    },
    priceRange: "Free",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ],
      opens: "09:00",
      closes: "18:00",
    },
    image: "https://kandevendtech.com/og-image.png",
    sameAs: [],
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://kandevendtech.com/#organization",
    name: "Kande VendTech",
    url: "https://kandevendtech.com",
    logo: "https://kandevendtech.com/og-image.png",
    description:
      "AI-powered smart vending machine company serving the Las Vegas valley with free installation and full-service vending solutions.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Las Vegas",
      addressRegion: "NV",
      addressCountry: "US",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "(725) 228-8822",
      contactType: "customer service",
      email: "hello@kandevendtech.com",
      areaServed: "Las Vegas Valley",
      availableLanguage: "English",
    },
    sameAs: [],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://kandevendtech.com/#website",
    name: "Kande VendTech",
    url: "https://kandevendtech.com",
    publisher: {
      "@id": "https://kandevendtech.com/#organization",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://kandevendtech.com/?s={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusiness),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organization),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(website),
        }}
      />
    </>
  );
}

export function ServiceJsonLd() {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Smart Vending Machine Services",
    provider: {
      "@id": "https://kandevendtech.com/#organization",
    },
    serviceType: "Vending Machine Service",
    areaServed: {
      "@type": "Place",
      name: "Las Vegas Valley, Nevada",
    },
    description:
      "Full-service smart vending machine solutions including free installation, automated restocking, maintenance, cashless payments, and real-time monitoring.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free installation, maintenance, and restocking",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Vending Machine Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Free Vending Machine Installation",
            description:
              "Complete delivery and installation of AI-powered smart vending machines at zero cost.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Automated Restocking",
            description:
              "Smart sensors notify us when inventory is low. We restock before you run out.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Maintenance & Repairs",
            description:
              "24/7 repair support and regular preventive maintenance at no charge.",
          },
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(serviceSchema),
      }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; href: string }[];
}) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://kandevendtech.com${item.href}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbSchema),
      }}
    />
  );
}

export function FAQJsonLd({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(faqSchema),
      }}
    />
  );
}
