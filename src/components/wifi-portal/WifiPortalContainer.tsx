
import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useWifiPortal } from "./useWifiPortal";
import WifiPortalContent from "./WifiPortalContent";
import { useLanguage } from "../LanguageContext";
import AdCarousel from "../ads/AdCarousel";
import VideoAd from "../ads/VideoAd";
import AudioPromo from "../ads/AudioPromo";
import { trackingService } from "@/services/tracking-service";
import { Step } from "./types";
import { usePortalConfig, applyPortalBranding } from "@/hooks/usePortalConfig";
import {
  DEMO_AD_SLIDES,
  DEMO_AUDIO_AD,
  DEMO_ENGAGEMENT_TYPE,
  DEMO_SESSION_MINUTES,
  DEMO_STARTING_POINTS,
  DEMO_SUPPORT_CONTACT,
  DEMO_VIDEO_AD,
  type LocalizedText,
} from "@/lib/portal-config-defaults";

const localizedText = (value: LocalizedText, language: string): string =>
  (language === 'en' ? value.en : value.fr);

const WifiPortalContainer = () => {
  const [showAds] = useState(true);
  const portal = usePortalConfig();

  // Dette §7 (INVENTAIRE-PORTAIL §3) : la couleur principale et le logo lus
  // depuis la config sont désormais APPLIQUÉS au CSS du portail (avant : lus
  // mais non appliqués). Aucun effet en l'absence de config publiée.
  useEffect(() => {
    applyPortalBranding(portal.themeColor, portal.logoUrl);
  }, [portal.themeColor, portal.logoUrl]);

  const {
    currentStep,
    setCurrentStep,
    engagementType,
    userData,
    loading,
    handleAuth,
    handleEngagementComplete,
    handleContinue,
    handleExtendTime,
    handleLeadGameComplete,
    handleNavigate,
    handleRedeemReward,
    handleInvite,
    handleReset,
    getMacAddress,
    handleGameComplete,
    handlePaymentComplete
  } = useWifiPortal({
    sessionMinutes: portal.sessionMinutes ?? DEMO_SESSION_MINUTES,
    startingPoints: portal.startingPoints ?? DEMO_STARTING_POINTS,
    engagementType: portal.engagementType ?? DEMO_ENGAGEMENT_TYPE,
    siteId: portal.siteId,
  });

  const { t, language } = useLanguage();

  const handleAdSlideChange = (index: number) => {
    const ad = portal.slides[index];
    if (ad) trackingService.adView(portal.siteId, ad.id);
  };

  const handleAdSlideClick = (slide: any) => {
    if (slide?.id) trackingService.adClick(portal.siteId, slide.id);
  };

  // Slides : config publiée (ad_videos) ; repli visuel UNIQUEMENT en démo isolée
  const slides = portal.slides.length > 0
    ? portal.slides
    : portal.isDemo
      ? DEMO_AD_SLIDES
      : [];

  const videoAd = portal.mediaAds.find((a) => a.kind === "video");
  const audioAd = portal.mediaAds.find((a) => a.kind === "audio");
  const supportContact = portal.supportContact ?? (portal.isDemo ? DEMO_SUPPORT_CONTACT : null);

  if (portal.loading) {
    return (
      <Layout withGradientBg>
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t("loading")}</p>
        </div>
      </Layout>
    );
  }

  // Fail-closed : un vrai site sans config publiée affiche l'erreur, jamais un fallback visuel
  if (portal.error && !portal.isDemo) {
    return (
      <Layout withGradientBg>
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-8 px-4">
          <Card className="w-full max-w-md p-6 text-center glass-card">
            <p className="text-status-error font-semibold mb-2">{portal.error}</p>
            <p className="text-sm text-muted-foreground">
              La configuration publiée de ce portail est indisponible. Veuillez réessayer plus tard.
            </p>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout withGradientBg>
      <div className="flex flex-col items-center justify-center min-h-[80vh] py-8">
        <div className="w-full max-w-md mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Logo de marque (config publiée : portal_config.logo_url / sites.logo_url).
                Dette §7 : avant lu mais non appliqué. Dégradation gracieuse : masqué
                tant qu'aucun logo n'est publié. */}
            {portal.logoUrl && (
              <img
                src={portal.logoUrl}
                alt={portal.portalName ?? t("portal")}
                className="h-12 w-auto object-contain mx-auto md:mx-0"
                onError={(e) => {
                  // Logo injoignable : on le masque plutôt que d'afficher un cassé
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <h1 className="text-4xl font-bold text-center md:text-left text-foreground">
              {portal.portalName ?? t("portal")}
            </h1>
          </div>

          <p className="text-center md:text-left text-muted-foreground mt-2">
            {portal.welcomeMessage
              ? localizedText(portal.welcomeMessage, language)
              : t("connectToWifi")}
          </p>

          {/* For demo purposes - show the simulated MAC address */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
            <p className="text-xs text-muted-foreground">
              {t("demoMac")} {getMacAddress()}
            </p>
            <Button variant="ghost" size="sm" className="h-6 px-2 py-0" onClick={handleReset}>
              <ChevronLeft className="h-3 w-3 mr-1" /> {t("reset")}
            </Button>
          </div>
          {supportContact && (
            <p className="text-xs text-muted-foreground mt-1">
              Support : {supportContact}
            </p>
          )}
        </div>

        {/* Advertisement Section - Shown conditionally */}
        {showAds && slides.length > 0 && (
          <div className="w-full max-w-md mb-8">
            <AdCarousel
              slides={slides}
              autoRotate={true}
              interval={7000}
              onSlideChange={handleAdSlideChange}
              onSlideClick={handleAdSlideClick}
              className="mb-4 wifi-card"
            />
          </div>
        )}

        {loading ? (
          <Card className="w-full max-w-md p-6 wifi-card">
            <div className="flex flex-col items-center justify-center">
              <div className="h-6 w-6 border-t-2 border-primary rounded-full animate-spin"></div>
              <p className="mt-4 text-muted-foreground">{t("loading")}</p>
            </div>
          </Card>
        ) : (
          <WifiPortalContent
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            engagementType={engagementType}
            userData={userData}
            handleAuth={handleAuth}
            handleEngagementComplete={handleEngagementComplete}
            handleContinue={handleContinue}
            handleExtendTime={handleExtendTime}
            handleLeadGameComplete={handleLeadGameComplete}
            handleNavigate={handleNavigate}
            handleRedeemReward={handleRedeemReward}
            handleInvite={handleInvite}
            handleGameComplete={handleGameComplete}
            handlePaymentComplete={handlePaymentComplete}
            modules={portal.enabledModules}
          />
        )}

        {/* Video or Audio Ad - from published config (ad_videos); demo URLs only in demo */}
        {showAds && currentStep !== Step.AUTH && (videoAd || (portal.isDemo && DEMO_VIDEO_AD) || audioAd || (portal.isDemo && DEMO_AUDIO_AD)) && (
          <div className="w-full max-w-md mt-8">
            {(videoAd || (portal.isDemo && DEMO_VIDEO_AD)) && (
              <VideoAd
                videoUrl={videoAd?.url ?? DEMO_VIDEO_AD.videoUrl}
                title={videoAd?.title ?? localizedText(DEMO_VIDEO_AD.title, language)}
                description={
                  videoAd
                    ? ""
                    : localizedText(DEMO_VIDEO_AD.description, language)
                }
                poster={videoAd?.thumbnailUrl ?? DEMO_VIDEO_AD.poster}
                autoPlay={false}
                className="mb-4 wifi-card"
                // Tracking : visionnage complet = contenu réellement regardé.
                onEnd={() => {
                  if (videoAd) trackingService.adProgress(portal.siteId, videoAd.id, 100);
                }}
              />
            )}

            {(audioAd || (portal.isDemo && DEMO_AUDIO_AD)) && (
              <AudioPromo
                audioUrl={audioAd?.url ?? DEMO_AUDIO_AD.audioUrl}
                title={audioAd?.title ?? localizedText(DEMO_AUDIO_AD.title, language)}
                subtitle={
                  audioAd
                    ? ""
                    : localizedText(DEMO_AUDIO_AD.subtitle, language)
                }
                coverImage={audioAd?.thumbnailUrl ?? DEMO_AUDIO_AD.coverImage}
                className="wifi-card"
                onEnd={() => {
                  if (audioAd) trackingService.adProgress(portal.siteId, audioAd.id, 100);
                }}
              />
            )}
          </div>
        )}

        <Card className="w-full max-w-md mt-8 p-4 glass-card">
          <p className="text-sm text-center text-muted-foreground">
            {t("byConnecting")}{" "}
            <a href="#" className="text-primary hover:underline">{t("termsOfService")}</a>{" "}
            {t("and")}{" "}
            <a href="#" className="text-primary hover:underline">{t("privacyPolicy")}</a>
          </p>
        </Card>
      </div>

    </Layout>
  );
};

export default WifiPortalContainer;
