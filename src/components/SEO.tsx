import React from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';

type SEOProps = {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
};

const DEFAULT_TITLE = 'Sixth Sense - Live Psychic Readings & Psychic Readings';
const DEFAULT_DESCRIPTION = 'Connect with gifted psychic advisors for guidance on love, career, life path, and more. Get live psychic readings via chat, phone, or video 24/7. 500+ verified psychics. First reading free!';
const DEFAULT_IMAGE = 'https://customer-assets.emergentagent.com/job_42069a8a-9a70-44df-94f4-f6571c6ab514/artifacts/ficttj0r_IMG_4688.jpeg';
const DEFAULT_KEYWORDS = 'psychic readings, online psychic, card reading reading, love psychic, career guidance, spiritual advisor, clairvoyant, medium, astrology, insights, live psychic chat, phone psychic, video psychic reading';
const SITE_NAME = 'Sixth Sense Psychics';
const TWITTER_HANDLE = '@sixthsensepsychics';

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
}: SEOProps) {
  // Only render on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  
  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={SITE_NAME} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="theme-color" content="#9C27B0" />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={fullTitle} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:creator" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Apple Mobile Web App */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
      
      {/* Microsoft */}
      <meta name="msapplication-TileColor" content="#9C27B0" />
      <meta name="msapplication-config" content="none" />
      
      {/* Schema.org structured data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "name": SITE_NAME,
          "description": description,
          "image": image,
          "priceRange": "$",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "US"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "10000",
            "bestRating": "5",
            "worstRating": "1"
          },
          "sameAs": [
            "https://facebook.com/sixthsensepsychics",
            "https://instagram.com/sixthsensepsychics",
            "https://twitter.com/sixthsensepsychics"
          ],
          "offers": {
            "@type": "Offer",
            "name": "Free First Reading",
            "description": "20 free credits for new members",
            "price": "0",
            "priceCurrency": "USD"
          }
        })}
      </script>
    </Head>
  );
}

// Specific SEO components for different page types
export function LandingSEO() {
  return (
    <SEO
      title="Live Psychic Readings Online - Chat, Phone & Video"
      description="Get accurate psychic readings from 500+ verified advisors. Love, career, and life guidance available 24/7. Free 20 credits for new members. Start your spiritual journey today!"
      keywords="psychic readings online, live psychic chat, phone psychic reading, video psychic, card reading reading online, love psychic reading, career psychic, psychic readings, free psychic reading, accurate psychic"
    />
  );
}

export function HomeSEO() {
  return (
    <SEO
      title="Find Your Psychic Advisor"
      description="Browse our top-rated psychic advisors. Get personalized readings on love, career, finances, and life path. Available 24/7 via chat, phone, or video."
      keywords="find psychic, best psychic advisors, top rated psychics, online spiritual advisor, psychic near me, love card reading, career reading"
    />
  );
}

export function InsightsSEO({ sign }: { sign?: string }) {
  const signTitle = sign ? `${sign} Daily Daily Insights` : 'Daily Daily Insightss';
  return (
    <SEO
      title={signTitle}
      description={`Get your free daily ${sign || ''} insights. AI-powered astrological insights for love, career, and life. Updated daily with personalized predictions.`}
      keywords={`${sign || ''} insights, daily insights, free insights, astrology, zodiac, ${sign || 'zodiac'} today, insights prediction`}
    />
  );
}

export function PsychicProfileSEO({ name, specialty, rating }: { name: string; specialty?: string; rating?: number }) {
  return (
    <SEO
      title={`${name} - ${specialty || 'Psychic Advisor'}`}
      description={`Connect with ${name}, a ${rating ? `${rating}-star rated ` : ''}${specialty || 'psychic advisor'}. Get accurate readings on love, career, and life. Book a session via chat, phone, or video.`}
      keywords={`${name} psychic, ${specialty || 'psychic reading'}, book psychic reading, online spiritual advisor`}
      type="product"
    />
  );
}
