import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../src/constants/theme';
import { LandingSEO } from '../src/components/SEO';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

const APP_NAME = "Sixth Sense";
const APP_LOGO_URL = "https://customer-assets.emergentagent.com/job_42069a8a-9a70-44df-94f4-f6571c6ab514/artifacts/rq5ym33h_Psychics.jpg";

// App Store URLs (placeholder - replace with actual URLs when apps are published)
const APP_STORE_URL = "https://apps.apple.com/app/sixth-sense-readings";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.sixthsense.readings";

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                   process.env.EXPO_PUBLIC_BACKEND_URL || 
                   'http://localhost:8001';

// Fallback testimonials in case API has no data
const FALLBACK_TESTIMONIALS = [
  {
    name: 'Sarah M.',
    text: 'Luna helped me understand my relationship better. Her tarot reading was incredibly accurate!',
    rating: 5,
  },
  {
    name: 'Michael R.',
    text: 'I was skeptical at first, but my career reading gave me the clarity I needed to make a big decision.',
    rating: 5,
  },
  {
    name: 'Jennifer L.',
    text: 'The live chat feature is so convenient. Now I have regular sessions with my favorite advisor.',
    rating: 5,
  },
];

const FEATURED_PSYCHICS = [
  {
    id: 'psy-001',
    name: 'Luna Starweaver',
    specialty: 'Love Readings',
    rating: 4.9,
    reviews: 342,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    rate: 3.99,
  },
  {
    id: 'psy-002',
    name: 'Mystic Rose',
    specialty: 'Crystal Ball',
    rating: 4.8,
    reviews: 218,
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    rate: 4.99,
  },
  {
    id: 'psy-003',
    name: 'Oracle Phoenix',
    specialty: 'Medium & Spirits',
    rating: 4.9,
    reviews: 567,
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    rate: 5.99,
  },
  {
    id: 'psy-004',
    name: 'Sage Moonlight',
    specialty: 'Astrology',
    rating: 4.7,
    reviews: 189,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    rate: 3.49,
  },
];

const SERVICES = [
  { icon: 'chatbubble', title: 'Live Chat', desc: 'Real-time chat readings with advisors' },
  { icon: 'star', title: 'Expert Advisors', desc: 'Vetted psychics ready to help' },
  { icon: 'shield-checkmark', title: 'Secure & Private', desc: 'Confidential conversations' },
  { icon: 'time', title: 'Available 24/7', desc: 'Connect anytime, anywhere' },
];

type Testimonial = {
  name: string;
  text: string;
  rating: number;
};

export default function LandingPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK_TESTIMONIALS);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/reviews/public/testimonials?limit=6`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setTestimonials(data);
        }
      }
    } catch (error) {
      console.log('Using fallback testimonials');
    } finally {
      setLoadingTestimonials(false);
    }
  };

  const openAppStore = () => {
    Linking.openURL(APP_STORE_URL);
  };

  const openPlayStore = () => {
    Linking.openURL(PLAY_STORE_URL);
  };

  const handleGetStarted = () => {
    router.push('/(auth)/welcome');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* SEO Meta Tags */}
      <LandingSEO />
      {/* Navigation Bar */}
      <View style={[styles.navbar, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.logoContainer}>
          <Image 
            source={{ uri: APP_LOGO_URL }} 
            style={styles.logoImage}
          />
          <Text style={styles.logoText}>{APP_NAME}</Text>
        </View>
        <View style={styles.navButtons}>
          <TouchableOpacity onPress={handleLogin} style={styles.navButton}>
            <Text style={styles.navButtonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleGetStarted} style={styles.navButtonPrimary}>
            <Text style={styles.navButtonPrimaryText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Section */}
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={styles.heroSection}
      >
        <View style={styles.heroContent}>
          <View style={styles.freeCreditsTag}>
            <Ionicons name="chatbubble" size={16} color="#FFD700" />
            <Text style={styles.freeCreditsText}>LIVE CHAT READINGS AVAILABLE 24/7</Text>
          </View>
          
          <Text style={styles.heroTitle}>
            <Text style={styles.heroTitleHighlight}>{APP_NAME}</Text>
            {'\n'}Your Spiritual Journey{'\n'}Starts Here
          </Text>
          
          <Text style={styles.heroSubtitle}>
            Connect with gifted spiritual advisors for guidance on love, career, life path, and more. 
            Start a live chat reading anytime.
          </Text>
          
          <TouchableOpacity onPress={handleGetStarted} style={styles.heroButton}>
            <LinearGradient
              colors={['#9C27B0', '#7B1FA2']}
              style={styles.heroButtonGradient}
            >
              <Text style={styles.heroButtonText}>Start Your Reading</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
          
          {/* App Download Section - Only show on WEB */}
          {isWeb && (
            <View style={styles.downloadSection}>
              <Text style={styles.downloadTitle}>Download Our App</Text>
              <View style={styles.storeButtonsRow}>
                <TouchableOpacity style={styles.storeButtonHero} onPress={openAppStore}>
                  <Ionicons name="logo-apple" size={22} color="#FFF" />
                  <View>
                    <Text style={styles.storeButtonLabel}>Download on the</Text>
                    <Text style={styles.storeButtonName}>App Store</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.storeButtonHero} onPress={openPlayStore}>
                  <Ionicons name="logo-google-playstore" size={22} color="#FFF" />
                  <View>
                    <Text style={styles.storeButtonLabel}>Get it on</Text>
                    <Text style={styles.storeButtonName}>Google Play</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Services Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How We Can Help You</Text>
        <Text style={styles.sectionSubtitle}>Choose your preferred way to connect</Text>
        
        <View style={styles.servicesGrid}>
          {SERVICES.map((service, index) => (
            <View key={index} style={styles.serviceCard}>
              <LinearGradient
                colors={['#9C27B0', '#7B1FA2']}
                style={styles.serviceIcon}
              >
                <Ionicons name={service.icon as any} size={24} color="#FFF" />
              </LinearGradient>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceDesc}>{service.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* How It Works */}
      <View style={[styles.section, styles.sectionDark]}>
        <Text style={[styles.sectionTitle, styles.textLight]}>How It Works</Text>
        <Text style={[styles.sectionSubtitle, styles.textMuted]}>Get started in 3 simple steps</Text>
        
        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Sign Up Free</Text>
            <Text style={styles.stepDesc}>Create your free account in seconds</Text>
          </View>
          
          <View style={styles.stepConnector} />
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Choose Your Advisor</Text>
            <Text style={styles.stepDesc}>Browse profiles, read reviews, and find your perfect match</Text>
          </View>
          
          <View style={styles.stepConnector} />
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepTitle}>Start Your Reading</Text>
            <Text style={styles.stepDesc}>Connect via live chat for instant guidance</Text>
          </View>
        </View>
      </View>

      {/* Featured Psychics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Advisors</Text>
        <Text style={styles.sectionSubtitle}>Our top-rated spiritual advisors</Text>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.psychicsScroll}
        >
          {FEATURED_PSYCHICS.map((psychic) => (
            <View key={psychic.id} style={styles.psychicCard}>
              <Image source={{ uri: psychic.image }} style={styles.psychicImage} />
              <View style={styles.psychicBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.psychicRating}>{psychic.rating}</Text>
              </View>
              <Text style={styles.psychicName}>{psychic.name}</Text>
              <Text style={styles.psychicSpecialty}>{psychic.specialty}</Text>
              <View style={styles.psychicMeta}>
                <Text style={styles.psychicReviews}>{psychic.reviews} reviews</Text>
                <Text style={styles.psychicRate}>${psychic.rate}/min</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        
        <TouchableOpacity onPress={handleGetStarted} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All Advisors</Text>
          <Ionicons name="arrow-forward" size={16} color="#9C27B0" />
        </TouchableOpacity>
      </View>

      {/* Testimonials */}
      <View style={[styles.section, styles.sectionDark]}>
        <Text style={[styles.sectionTitle, styles.textLight]}>What Our Clients Say</Text>
        <Text style={[styles.sectionSubtitle, styles.textMuted]}>Real experiences from real people</Text>
        
        {loadingTestimonials ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#9C27B0" />
          </View>
        ) : (
          <View style={styles.testimonialsContainer}>
            {testimonials.map((testimonial, index) => (
              <View key={index} style={styles.testimonialCard}>
                <View style={styles.testimonialStars}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Ionicons key={i} name="star" size={16} color="#FFD700" />
                  ))}
                </View>
                <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
                <Text style={styles.testimonialName}>— {testimonial.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Become a Psychic Advisor Section */}
      <View style={styles.advisorSection}>
        <View style={styles.advisorContent}>
          <View style={styles.advisorLeft}>
            <View style={styles.advisorBadge}>
              <Ionicons name="sparkles" size={14} color="#E8A0B8" />
              <Text style={styles.advisorBadgeText}>JOIN OUR TEAM</Text>
            </View>
            <Text style={styles.advisorTitle}>Are You a Gifted Advisor?</Text>
            <Text style={styles.advisorSubtitle}>
              Share your spiritual gifts with thousands of seekers worldwide. Set your own rates, work from anywhere, and build a thriving practice.
            </Text>
            
            <View style={styles.advisorBenefits}>
              <View style={styles.advisorBenefit}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="wallet" size={20} color="#9C27B0" />
                </View>
                <View>
                  <Text style={styles.benefitTitle}>Earn 40% Commission</Text>
                  <Text style={styles.benefitDesc}>Competitive rates for your readings</Text>
                </View>
              </View>
              
              <View style={styles.advisorBenefit}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="time" size={20} color="#9C27B0" />
                </View>
                <View>
                  <Text style={styles.benefitTitle}>Flexible Schedule</Text>
                  <Text style={styles.benefitDesc}>Work when and where you want</Text>
                </View>
              </View>
              
              <View style={styles.advisorBenefit}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="people" size={20} color="#9C27B0" />
                </View>
                <View>
                  <Text style={styles.benefitTitle}>Global Reach</Text>
                  <Text style={styles.benefitDesc}>Connect with clients worldwide</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.advisorRight}>
            <View style={styles.advisorAppCard}>
              <Image 
                source={{ uri: 'https://customer-assets.emergentagent.com/job_42069a8a-9a70-44df-94f4-f6571c6ab514/artifacts/rq5ym33h_Advisor.jpg' }}
                style={styles.advisorAppLogo}
              />
              <Text style={styles.advisorAppName}>Sixth Sense Advisors</Text>
              <Text style={styles.advisorAppDesc}>Download our advisor app to apply</Text>
              
              {/* App Store buttons - Only show on WEB */}
              {isWeb && (
                <View style={styles.appStoreButtons}>
                  <TouchableOpacity style={styles.appStoreButton}>
                    <Ionicons name="logo-apple" size={20} color="#FFF" />
                    <View>
                      <Text style={styles.appStoreLabel}>Download on the</Text>
                      <Text style={styles.appStoreName}>App Store</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.appStoreButton}>
                    <Ionicons name="logo-google-playstore" size={20} color="#FFF" />
                    <View>
                      <Text style={styles.appStoreLabel}>Get it on</Text>
                      <Text style={styles.appStoreName}>Google Play</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* CTA Section */}
      <LinearGradient
        colors={['#9C27B0', '#7B1FA2', '#6A1B9A']}
        style={styles.ctaSection}
      >
        <Text style={styles.ctaTitle}>Ready to Discover Your Path?</Text>
        <Text style={styles.ctaSubtitle}>
          Join thousands of people who found clarity and guidance with {APP_NAME}
        </Text>
        
        <View style={styles.ctaCredits}>
          <Ionicons name="chatbubble" size={24} color="#FFD700" />
          <Text style={styles.ctaCreditsText}>LIVE CHAT</Text>
          <Text style={styles.ctaCreditsSubtext}>Connect with advisors 24/7</Text>
        </View>
        
        <TouchableOpacity onPress={handleGetStarted} style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>Get Started Now</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerTop}>
          <View style={styles.footerBrand}>
            <View style={styles.logoContainer}>
              <Image 
                source={{ uri: APP_LOGO_URL }} 
                style={styles.logoImage}
              />
              <Text style={styles.logoText}>{APP_NAME}</Text>
            </View>
            <Text style={styles.footerTagline}>Your trusted source for psychic readings</Text>
          </View>
          
          <View style={styles.footerLinksRow}>
            <TouchableOpacity 
              style={styles.footerLinkButton}
              onPress={() => router.push('/support')}
            >
              <Ionicons name="headset" size={20} color="#9C27B0" />
              <Text style={styles.footerLinkButtonText}>Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.footerLinkButton}
              onPress={() => router.push('/terms')}
            >
              <Ionicons name="document-text" size={20} color="#9C27B0" />
              <Text style={styles.footerLinkButtonText}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.footerBottom}>
          <Text style={styles.footerCopyright}>© 2026 {APP_NAME}. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  navButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  navButtonPrimary: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 6,
  },
  navButtonPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  heroSection: {
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.lg,
  },
  heroContent: {
    maxWidth: 800,
    alignSelf: 'center',
    alignItems: 'center',
  },
  freeCreditsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    marginBottom: SPACING.lg,
  },
  freeCreditsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: isWeb ? 48 : 32,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: isWeb ? 58 : 42,
    marginBottom: SPACING.lg,
  },
  heroTitleHighlight: {
    color: '#E1BEE7',
    fontSize: isWeb ? 56 : 38,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 500,
    marginBottom: SPACING.xl,
  },
  heroButton: {
    marginBottom: SPACING.lg,
  },
  heroButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  downloadSection: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  downloadTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  storeButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  storeButtonHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  storeButtonLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
  },
  storeButtonName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFD700',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  section: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  sectionDark: {
    backgroundColor: '#1A1A2E',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  textLight: {
    color: '#FFF',
  },
  textMuted: {
    color: 'rgba(255,255,255,0.7)',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  serviceCard: {
    width: isWeb ? 220 : (width - SPACING.lg * 2 - SPACING.md) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: SPACING.xs,
  },
  serviceDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  stepsContainer: {
    flexDirection: isWeb ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  step: {
    alignItems: 'center',
    maxWidth: 250,
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  stepConnector: {
    width: isWeb ? 60 : 2,
    height: isWeb ? 2 : 30,
    backgroundColor: 'rgba(156, 39, 176, 0.5)',
  },
  psychicsScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  psychicCard: {
    width: 180,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  psychicImage: {
    width: '100%',
    height: 180,
  },
  psychicBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  psychicRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  psychicName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  psychicSpecialty: {
    fontSize: 12,
    color: '#9C27B0',
    paddingHorizontal: SPACING.sm,
  },
  psychicMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  psychicReviews: {
    fontSize: 11,
    color: '#666',
  },
  psychicRate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
  },
  testimonialsContainer: {
    flexDirection: isWeb ? 'row' : 'column',
    justifyContent: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  testimonialCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: SPACING.lg,
    maxWidth: 350,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  testimonialStars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: SPACING.sm,
  },
  testimonialText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: SPACING.sm,
  },
  testimonialName: {
    fontSize: 13,
    color: '#9C27B0',
    fontWeight: '600',
  },
  ctaSection: {
    paddingVertical: SPACING.xxl * 1.5,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: SPACING.lg,
    maxWidth: 400,
  },
  ctaCredits: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  ctaCreditsText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFD700',
    marginTop: SPACING.xs,
  },
  ctaCreditsSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  ctaButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9C27B0',
  },
  footer: {
    backgroundColor: '#F8F9FA',
    paddingTop: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  footerTop: {
    flexDirection: isWeb ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: SPACING.xl,
    paddingBottom: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  footerBrand: {
    maxWidth: 250,
  },
  footerTagline: {
    fontSize: 13,
    color: '#666',
    marginTop: SPACING.sm,
  },
  footerLinks: {
    gap: SPACING.sm,
  },
  footerLinkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: SPACING.xs,
  },
  footerLink: {
    fontSize: 13,
    color: '#666',
  },
  footerBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  footerCopyright: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  footerLinksRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  footerLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  footerLinkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
  },
  loadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  // Become a Psychic Advisor Section
  advisorSection: {
    backgroundColor: '#F8F0FF',
    paddingVertical: SPACING.xxl * 1.5,
    paddingHorizontal: SPACING.md,
  },
  advisorContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  advisorLeft: {
    width: '100%',
    maxWidth: 500,
  },
  advisorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#9C27B0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  advisorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  advisorTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: SPACING.sm,
  },
  advisorSubtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  advisorBenefits: {
    gap: SPACING.md,
  },
  advisorBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8D5F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  benefitDesc: {
    fontSize: 13,
    color: '#666',
  },
  advisorRight: {
    width: '100%',
    maxWidth: 400,
  },
  advisorAppCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  advisorAppLogo: {
    width: 70,
    height: 70,
    borderRadius: 16,
    marginBottom: SPACING.sm,
  },
  advisorAppName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  advisorAppDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  appStoreButtons: {
    flexDirection: 'column',
    gap: SPACING.sm,
    width: '100%',
  },
  appStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#333',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
  },
  appStoreLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  appStoreName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
