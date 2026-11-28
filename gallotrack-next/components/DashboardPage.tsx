'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  CalendarClock,
  Dna,
  PieChart,
  Eye,
  EyeOff,
  Plus,
  Swords,
  Star,
  Trophy,
  TrendingUp,
  Zap,
} from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';
import ChickenPhoto from '@/components/ChickenPhoto';
import DateRangePicker from '@/components/DateRangePicker';
import MatchLogsTable from '@/components/match/MatchLogsTable';
import BreedingPairPerformanceAnalytics from '@/components/BreedingPairPerformanceAnalytics';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import { useAuthOptional } from '@/lib/contexts/auth-context';
import { formatDate, useT } from '@/lib/i18n';
import { formatBirdCodeForDisplay } from '@/lib/bird-code';
import { canFight, formatColorDisplay, isFemale, isMale } from '@/lib/helpers';
import { useChartTokens, withAlpha } from '@/lib/chart-tokens';
import { selectUpcomingMilestoneCard } from '@/lib/milestone-card';
import { getPrimaryHeroImage } from '@/lib/hero-config';
import { classifyFlock, getBreedingClassification } from '@/lib/breeding-classification';
import { downloadCsv, printReport } from '@/lib/report-export';
import type { FowlRecord } from '@/lib/types';
import { strainColor } from '@/lib/theme/heritage';
import {
  DASHBOARD_KPI_CARD,
  DASHBOARD_KPI_CAPTION,
  DASHBOARD_KPI_LABEL,
  DASHBOARD_KPI_VALUE,
} from '@/lib/dashboard-kpi';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
);

function initials(name: string): string {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function strainName(label: string): string {
  return label.replace(/\s+Cross$/i, '').trim();
}

function plainPhoto(fowl?: FowlRecord | null) {
  return Boolean(fowl?.image_url || fowl?.photo_path || fowl?.photo_thumb_path);
}

export default function DashboardPage() {
  const t = useT();
  const fowl = useFowl();
  const ui = useUI();
  const auth = useAuthOptional();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const chart = useChartTokens(resolvedTheme);

  const {
    fowls,
    matchHistory,
    pairingAnalytics,
    activeFowls,
    registryCounts,
    monthLabels,
    activeSpark,
    trendWinRate,
    matchesByMonth,
    upcomingMilestones,
    crossbreedChartData,
    winRatePct,
    winsCount,
    lossesCount,
    dateRangeLabel,
    dateRangeOpen,
    setDateRangeOpen,
    dateRangePreset,
    setDateRangePreset,
    dateRangeCustom,
    setDateRangeCustom,
    fetchDatabaseResources,
    birdCodes,
  } = fowl;

  const [heroHidden, setHeroHidden] = React.useState(false);
  const [heroImageFailed, setHeroImageFailed] = React.useState(false);
  const heroStorageKey = `gt_heritage_hero_hidden_${auth?.currentUserId || 'guest'}`;

  React.useEffect(() => {
    try {
      setHeroHidden(window.localStorage.getItem(heroStorageKey) === '1');
    } catch {
      setHeroHidden(false);
    }
  }, [heroStorageKey]);

  const toggleHero = () => {
    setHeroHidden((hidden) => {
      const next = !hidden;
      try {
        window.localStorage.setItem(heroStorageKey, next ? '1' : '0');
      } catch {
        /* localStorage can be unavailable */
      }
      return next;
    });
  };

  const navigate = (page: string, subTab?: string) => {
    if (subTab) ui.setProfilingSubTab(subTab as never);
    router.push(`/${page}`);
  };
  const drawsCount = React.useMemo(
    () => matchHistory.filter((match) => (match.outcome || '').toLowerCase() === 'draw').length,
    [matchHistory],
  );
  const decidedCount = winsCount + lossesCount;
  const lowSample = decidedCount > 0 && decidedCount < 3;

  const bloodlineCount = React.useMemo(() => {
    const names = new Set<string>();
    activeFowls.forEach((bird) => {
      (bird.breed || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .forEach((name) => names.add(name));
    });
    return names.size;
  }, [activeFowls]);

  const welcomeName =
    (auth?.adminName || '').trim().split(/\s+/)[0] ||
    (auth?.username || '').trim().split('@')[0] ||
    'Farmer';

  const milestoneCard = selectUpcomingMilestoneCard(upcomingMilestones);
  const visibleMilestones = milestoneCard.visible.slice(0, 4);

  const topStrains = React.useMemo(() => {
    const strainMap = new Map<string, { count: number; males: number; females: number }>();
    activeFowls.forEach((bird) => {
      (bird.breed || 'Unspecified')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .forEach((name) => {
          const current = strainMap.get(name) || { count: 0, males: 0, females: 0 };
          current.count += 1;
          if (isMale(bird.gender)) current.males += 1;
          else if (isFemale(bird.gender)) current.females += 1;
          strainMap.set(name, current);
        });
    });
    return Array.from(strainMap.entries())
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
      .slice(0, 6);
  }, [activeFowls]);

  const strainPhoto = React.useMemo(() => {
    const map = new Map<string, FowlRecord>();
    topStrains.forEach(([strain]) => {
      const match = activeFowls.find((bird) =>
        (bird.breed || '')
          .split(',')
          .map((name) => name.trim().toLowerCase())
          .includes(strain.toLowerCase()),
      );
      if (match) map.set(strain, match);
    });
    return map;
  }, [activeFowls, topStrains]);

  const trendPointCount = React.useMemo(
    () =>
      monthLabels.filter((_, index) => activeSpark[index] > 0 || matchesByMonth[index] > 0).length,
    [activeSpark, matchesByMonth, monthLabels],
  );

  const recentCockMatches = React.useMemo(() => {
    const fowlById = new Map(fowls.map((bird) => [bird.id, bird]));
    return matchHistory
      .filter((match) => {
        if (match.fowl_id == null) return true;
        const bird = fowlById.get(Number(match.fowl_id));
        return !bird || canFight(bird);
      })
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5);
  }, [fowls, matchHistory]);

  const unlinkedCount = React.useMemo(
    () => recentCockMatches.filter((match) => match.fowl_id == null).length,
    [recentCockMatches],
  );

  const crossbreedItems = crossbreedChartData.labels.map((label, index) => ({
    label,
    name: strainName(label),
    share: crossbreedChartData.data[index] ?? 0,
    winRate: crossbreedChartData.winRates[index] ?? 0,
    wins: crossbreedChartData.wins[index] ?? 0,
    losses: crossbreedChartData.losses[index] ?? 0,
    total: crossbreedChartData.totals[index] ?? 0,
    color: strainColor(strainName(label)),
  }));

  const matchColumns = [
    'Date',
    'Our Chicken',
    'Opponent',
    'Breed',
    'Opponent Breed',
    'Event',
    'Outcome',
    'Location',
    'Post-Fight Condition',
    'Notes',
  ];
  const matchRows = React.useMemo(
    () =>
      matchHistory.map((match) => [
        match.date,
        match.entry_name,
        match.opponent,
        match.breed,
        match.opponent_breed,
        [match.event_type, match.type, match.age_category].filter(Boolean).join(' · '),
        match.outcome,
        match.location,
        match.post_fight_condition,
        [match.side, match.notes].filter(Boolean).join(' · '),
      ]),
    [matchHistory],
  );
  const registryColumns = [
    'Bird Code',
    'Name',
    'Gender',
    'Breed',
    'Feather Color',
    'Trait',
    'Birthdate',
    'Age',
    'Status',
    'Weight',
    'Height',
    'Sire',
    'Dam',
    'Bloodline %',
    'Composition basis',
  ];
  const registryRows = React.useMemo(() => {
    const classMap = classifyFlock(fowls);
    return fowls.map((bird) => {
      const classification =
        classMap.get(String(bird.id)) ?? getBreedingClassification(bird, fowls);
      const displayBreed =
        classification.type === 'Crossbred' ? classification.derivedBreed : bird.breed;
      const compositionBasis =
        classification.compositionSource === 'declared'
          ? 'Declared'
          : classification.compositionSource === 'adjusted'
            ? 'Adjusted'
            : classification.compositionSource === 'assumed'
              ? 'Assumed'
              : 'Derived';
      return [
        formatBirdCodeForDisplay(birdCodes.get(String(bird.id)) || bird.bird_code || ''),
        bird.name,
        bird.gender,
        displayBreed,
        formatColorDisplay(bird.feather_color || bird.color, bird.color_category),
        bird.trait || bird.behavior_trait || '—',
        bird.birthdate,
        bird.age,
        bird.status,
        bird.weight,
        bird.height,
        bird.sire,
        bird.dam,
        classification.purityPct,
        compositionBasis,
      ];
    });
  }, [birdCodes, fowls]);

  const exportMatchesCsv = () =>
    downloadCsv('gallotrack-match-history', [matchColumns, ...matchRows]);
  const exportRegistryCsv = () =>
    downloadCsv('gallotrack-fowl-registry', [registryColumns, ...registryRows]);
  const printPerformanceReport = () =>
    printReport({
      title: 'GalloTrack Performance Report',
      meta: `${dateRangeLabel} · ${activeFowls.length} active birds · ${matchHistory.length} matches logged`,
      sections: [
        {
          heading: 'Performance Metrics',
          fields: [
            {
              label: 'Overall (all time)',
              value: decidedCount > 0 ? `${winRatePct}%` : '—',
            },
            { label: 'Record', value: `${winsCount}W - ${lossesCount}L - ${drawsCount}D` },
            { label: 'Matches logged', value: String(matchHistory.length) },
            {
              label: 'Active registry',
              value: `${registryCounts.total} active (${registryCounts.breedingMales} breeding males · ${registryCounts.breedingFemales} breeding females · ${registryCounts.nonBreeding} offspring | ${registryCounts.maleSex} male · ${registryCounts.femaleSex} female)`,
            },
          ],
        },
        {
          heading: 'Bloodline Win Ratios',
          table: {
            columns: ['Bloodline cross', 'Wins', 'Losses', 'Matches', 'Win rate %', 'Win share %'],
            rows: crossbreedItems.map((item) => [
              item.label,
              item.wins,
              item.losses,
              item.total,
              item.winRate,
              item.share,
            ]),
          },
        },
        {
          heading: 'Monthly Activity',
          table: {
            columns: ['Month', 'Matches', 'Win rate %'],
            rows: monthLabels.map((label, index) => [
              label,
              matchesByMonth[index],
              trendWinRate[index] ?? 'No matches',
            ]),
          },
        },
        { heading: 'Fowl Registry', table: { columns: registryColumns, rows: registryRows } },
      ],
    });

  const actionRef = React.useRef<(action: string) => void>(() => {});

  React.useEffect(() => {
    actionRef.current = (action) => {
      if (action === 'matches') exportMatchesCsv();
      else if (action === 'registry') exportRegistryCsv();
      else if (action === 'print') printPerformanceReport();
      else if (action === 'sync') void fetchDatabaseResources();
    };
  });

  React.useEffect(() => {
    const handler = (event: Event) => {
      actionRef.current((event as CustomEvent<string>).detail);
    };
    window.addEventListener('gt-dashboard-action', handler);
    return () => window.removeEventListener('gt-dashboard-action', handler);
  }, []);

  const heroImage = getPrimaryHeroImage();

  return (
    <div className="animate-fadeIn min-w-0 space-y-5">
      <p className="sr-only">{t('nav.dashboard')}</p>
      <div className="flex justify-start min-[1400px]:hidden">
        <DateRangePicker
          label={dateRangeLabel}
          preset={dateRangePreset}
          custom={dateRangeCustom}
          open={dateRangeOpen}
          onOpenChange={setDateRangeOpen}
          onApply={(preset, custom) => {
            setDateRangePreset(preset);
            setDateRangeCustom(custom);
          }}
        />
      </div>
      <section
        aria-label={`${t('heritage.welcomeBack')} ${welcomeName}`}
        className={`from-hero-start via-hero-mid to-hero-end relative overflow-hidden rounded-2xl bg-gradient-to-r shadow-xl ${
          heroHidden ? 'min-h-12' : ''
        }`}
      >
        <div
          hidden={heroHidden}
          className="relative z-10 grid min-h-[12rem] gap-4 p-5 sm:min-h-[13rem] sm:p-7 lg:grid-cols-[1fr_38%] lg:items-center"
        >
          <div className="min-w-0">
            <p className="text-sm font-black tracking-wide text-white/85">
              {t('heritage.welcomeBack')}, {welcomeName}
            </p>
            <h2 className="mt-1 max-w-2xl text-3xl leading-tight font-black text-white sm:text-4xl">
              {t('heritage.heroTitle')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85 sm:text-base">
              {t('heritage.heroDescription')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/30 bg-black/20 px-3 text-xs font-black text-white">
                <ChickenIcon className="text-hero-start h-4 w-4" />
                {t('heritage.registeredChickens', { count: registryCounts.flockTotal })}
              </span>
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/30 bg-black/20 px-3 text-xs font-black text-white">
                <span className="text-brand-orange h-3.5 w-3.5 rounded-full border-2 border-current" />
                {t('heritage.bloodlines', { count: bloodlineCount })}
              </span>
            </div>
          </div>
          <div className="relative hidden h-48 min-w-0 lg:block">
            {!heroImageFailed ? (
              <Image
                src={heroImage.src}
                alt={heroImage.alt}
                fill
                priority
                sizes="(min-width: 1024px) 440px, 0px"
                className="rounded-2xl object-cover"
                onError={() => setHeroImageFailed(true)}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-black/15">
                <img src="/brand/logo-mark.svg" alt="" className="h-32 w-32 opacity-40" />
              </div>
            )}
            <div className="from-hero-start/50 pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r via-transparent to-transparent" />
          </div>
        </div>
        <button
          type="button"
          onClick={toggleHero}
          aria-label={heroHidden ? t('heritage.showBanner') : t('heritage.hideBanner')}
          className={`absolute right-3 z-20 inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:outline-none ${
            heroHidden
              ? 'border-border bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-ring top-1/2 -translate-y-1/2'
              : 'top-3 border-white/30 bg-black/20 text-white hover:bg-black/30 focus-visible:ring-white'
          }`}
        >
          {heroHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {heroHidden ? t('heritage.show') : t('heritage.hide')}
        </button>
        {heroHidden && (
          <div className="border-card/20 bg-card text-muted-foreground flex min-h-12 items-center border-t px-4 pr-24 text-xs font-semibold">
            {t('heritage.showBanner')}
          </div>
        )}
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<ChickenIcon className="h-5 w-5" />}
          label={t('dashboard.registryCardLabel')}
          value={registryCounts.flockTotal}
          caption={`${registryCounts.total} ${t('domain.statusActive').toLowerCase()} · ${registryCounts.archived} ${t('domain.statusArchived').toLowerCase()} · ${registryCounts.deceased} ${t('domain.statusDeceased').toLowerCase()}`}
          watermark={<ChickenIcon className="h-28 w-28" />}
          onClick={() => navigate('profiling', 'males')}
        />
        <KpiCard
          icon={<Trophy className="h-5 w-5" />}
          label={t('dashboard.totalMatchesLogged')}
          value={matchHistory.length}
          caption={t('heritage.matchRecords', { count: matchHistory.length })}
          watermark={<Trophy className="h-28 w-28" />}
          tone="orange"
          onClick={() => navigate('profiling', 'matchForm')}
        />
        <KpiCard
          icon={<Star className="h-5 w-5" />}
          label={t('dashboard.overallWinRate')}
          value={decidedCount > 0 ? `${winRatePct}%` : '—%'}
          caption={`${winsCount}W - ${lossesCount}L - ${drawsCount}D`}
          badge={
            lowSample
              ? decidedCount === 1
                ? t('heritage.oneMatch')
                : t('heritage.lowSample')
              : undefined
          }
          watermark={<Star className="h-28 w-28" />}
          tone="gold"
          onClick={() => ui.setShowPerFowlBreakdownModal(true)}
        />
        <div
          className={`${DASHBOARD_KPI_CARD} border-border bg-card flex min-h-full min-w-0 flex-col rounded-2xl border p-5 shadow-sm`}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span
              className={`${DASHBOARD_KPI_LABEL} text-muted-foreground font-black tracking-wider uppercase`}
            >
              {t('heritage.quickActions')}
            </span>
            <span className="bg-accent-soft text-accent flex h-10 w-10 items-center justify-center rounded-full">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2">
            <button
              type="button"
              onClick={() => navigate('profiling', 'form')}
              className="border-accent/25 bg-accent-soft text-accent hover:border-accent flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('heritage.registerChicken')}
            </button>
            <button
              type="button"
              onClick={() => navigate('profiling', 'matchForm')}
              className="border-border bg-muted text-foreground hover:bg-accent-soft hover:border-accent/30 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black"
            >
              <Swords className="h-4 w-4" aria-hidden="true" />
              {t('heritage.logMatch')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="border-border bg-card flex min-w-0 flex-col rounded-2xl border p-4 shadow-sm sm:p-5 lg:col-span-5">
          <SectionHeader
            icon={<CalendarClock className="h-4 w-4" />}
            title={t('dashboard.upcomingMilestones')}
            subtitle={
              milestoneCard.totalSoon > 0
                ? t('dashboard.inNext30Days', { count: milestoneCard.totalSoon })
                : t('heritage.noMilestones')
            }
            action={
              <Link
                href="/milestones"
                className="text-accent min-h-11 text-xs font-black uppercase hover:underline"
              >
                {t('heritage.viewAll')}
              </Link>
            }
          />
          <div className="mt-3 flex-1 space-y-2">
            {visibleMilestones.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm font-semibold">
                {t('heritage.noMilestones')}
              </p>
            ) : (
              visibleMilestones.map(({ fowl: bird, info }) => {
                const code =
                  birdCodes.get(String(bird.id)) || bird.bird_code || bird.chicken_code || '';
                const next = info.next;
                return (
                  <div
                    key={bird.id}
                    className="border-border bg-muted/35 flex min-w-0 items-center gap-3 rounded-xl border p-2.5"
                  >
                    <ChickenPhoto
                      name={bird.name}
                      code={code}
                      imageUrl={bird.image_url}
                      photoPath={bird.photo_path}
                      photoThumbPath={bird.photo_thumb_path}
                      size={40}
                      shape="square"
                      interactive={false}
                      showLightbox={false}
                      fallback={
                        <span className="text-muted-foreground font-mono text-xs font-black">
                          {initials(bird.name)}
                        </span>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-card-foreground text-sm font-black break-words">
                        {bird.name}
                      </p>
                      <p className="text-muted-foreground text-xs font-semibold break-words">
                        {next
                          ? t('heritage.becomesStage', { stage: next.stage })
                          : t('notifications.fullyMature')}
                      </p>
                    </div>
                    {next && (
                      <span className="border-accent/20 bg-accent-soft text-accent shrink-0 rounded-full border px-2 py-1 text-xs font-black">
                        {formatDate(next.date, t.language, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="border-border bg-card flex min-w-0 flex-col rounded-2xl border p-4 shadow-sm sm:p-5 lg:col-span-4">
          <SectionHeader
            icon={<Dna className="h-4 w-4" aria-hidden="true" />}
            title={t('heritage.bloodlineOverview')}
            subtitle={t('heritage.bloodlineSubtitle')}
            action={
              <Link
                href="/lineage"
                className="text-accent min-h-11 text-xs font-black uppercase hover:underline"
              >
                {t('heritage.viewDetails')}
              </Link>
            }
          />
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-2.5">
            {topStrains.length === 0 ? (
              <p className="text-muted-foreground col-span-2 py-8 text-center text-sm font-semibold">
                {t('heritage.noBloodlines')}
              </p>
            ) : (
              topStrains.slice(0, 4).map(([strain, data]) => {
                const photo = strainPhoto.get(strain);
                return (
                  <div
                    key={strain}
                    className="border-border bg-muted/25 min-w-0 overflow-hidden rounded-xl border"
                  >
                    <div className="bg-muted relative h-20 w-full">
                      {photo && plainPhoto(photo) ? (
                        <ChickenPhoto
                          name={photo.name}
                          code={
                            birdCodes.get(String(photo.id)) ||
                            photo.bird_code ||
                            photo.chicken_code ||
                            ''
                          }
                          imageUrl={photo.image_url}
                          photoPath={photo.photo_path}
                          photoThumbPath={photo.photo_thumb_path}
                          size={80}
                          shape="square"
                          interactive={false}
                          showLightbox={false}
                          className="h-20 w-full rounded-none"
                          imgClassName="object-cover"
                          fallback={
                            <span className="text-muted-foreground font-mono text-lg font-black">
                              {initials(strain)}
                            </span>
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground flex h-full items-center justify-center font-mono text-lg font-black">
                          {initials(strain)}
                        </span>
                      )}
                    </div>
                    <div
                      className="min-w-0 border-t-4 p-2.5"
                      style={{ borderTopColor: strainColor(strain) }}
                    >
                      <p className="text-card-foreground text-sm font-black break-words">
                        {strain}
                      </p>
                      <p className="text-muted-foreground text-xs font-semibold">
                        {t('heritage.strainChickenCount', { count: data.count })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="border-border bg-card flex min-w-0 flex-col rounded-2xl border p-4 shadow-sm sm:p-5 lg:col-span-3">
          <SectionHeader
            icon={<TrendingUp className="h-4 w-4" />}
            title={t('heritage.populationPerformance')}
            subtitle={t('heritage.populationPerformanceSubtitle')}
          />
          {trendPointCount < 4 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <TrendingUp className="text-muted-foreground mb-2 h-8 w-8" aria-hidden="true" />
              <p className="text-card-foreground text-sm font-black">
                {t('heritage.trendNotEnough')}
              </p>
              <p className="text-muted-foreground mt-1 text-xs font-semibold">
                {t('heritage.trendNotEnoughDesc')}
              </p>
            </div>
          ) : (
            <div className="mt-3 min-h-56 flex-1">
              <Line
                aria-label={`${t('heritage.populationPerformance')}. ${t('heritage.populationPerformanceSubtitle')}.`}
                data={{
                  labels: monthLabels,
                  datasets: [
                    {
                      label: t('heritage.totalPopulation'),
                      data: activeSpark,
                      borderColor: chart.success,
                      backgroundColor: withAlpha(chart.success, 0.16),
                      fill: true,
                      borderWidth: 2.5,
                      pointRadius: 3,
                      tension: 0.35,
                    },
                    {
                      label: t('heritage.winRateTrend'),
                      data: trendWinRate,
                      borderColor: chart.warning,
                      backgroundColor: withAlpha(chart.warning, 0.06),
                      fill: false,
                      borderWidth: 2,
                      borderDash: [5, 4],
                      pointRadius: 3,
                      spanGaps: false,
                      tension: 0.35,
                      yAxisID: 'y1',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: {
                      display: true,
                      labels: {
                        boxWidth: 10,
                        boxHeight: 10,
                        color: chart.foreground,
                        font: { size: 10, weight: 'bold' },
                      },
                    },
                    tooltip: {
                      backgroundColor: chart.card,
                      titleColor: chart.foreground,
                      bodyColor: chart.foreground,
                      borderColor: chart.border,
                      borderWidth: 1,
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: chart.mutedForeground, font: { size: 10, weight: 'bold' } },
                      title: {
                        display: true,
                        text: t('heritage.month'),
                        color: chart.mutedForeground,
                        font: { size: 10, weight: 'bold' },
                      },
                    },
                    y: {
                      beginAtZero: true,
                      grid: { color: withAlpha(chart.mutedForeground, 0.2) },
                      ticks: { color: chart.mutedForeground, font: { size: 10, weight: 'bold' } },
                      title: {
                        display: true,
                        text: t('heritage.totalPopulation'),
                        color: chart.mutedForeground,
                        font: { size: 10, weight: 'bold' },
                      },
                    },
                    y1: {
                      beginAtZero: true,
                      max: 100,
                      position: 'right',
                      grid: { drawOnChartArea: false },
                      ticks: {
                        color: chart.warning,
                        callback: (value) => `${value}%`,
                        font: { size: 10, weight: 'bold' },
                      },
                      title: {
                        display: true,
                        text: t('heritage.winRateTrend'),
                        color: chart.mutedForeground,
                        font: { size: 10, weight: 'bold' },
                      },
                    },
                  },
                }}
              />
              <table className="sr-only">
                <caption>{t('heritage.populationPerformance')}</caption>
                <thead>
                  <tr>
                    <th>{t('heritage.date')}</th>
                    <th>{t('heritage.totalPopulation')}</th>
                    <th>{t('heritage.winRateTrend')}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthLabels.map((label, index) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{activeSpark[index]}</td>
                      <td>{trendWinRate[index] == null ? '—' : `${trendWinRate[index]}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="border-border bg-card flex min-w-0 flex-col rounded-2xl border p-4 shadow-sm sm:p-5 xl:col-span-4">
          <SectionHeader
            icon={<PieChart className="h-4 w-4" aria-hidden="true" />}
            title={t('heritage.bloodlineWinRatios')}
            subtitle={t('heritage.bloodlineWinSubtitle')}
          />
          {crossbreedChartData.hasData ? (
            <>
              <div className="relative mx-auto my-3 h-44 w-44">
                <Doughnut
                  aria-label={t('heritage.bloodlineWinRatios')}
                  data={{
                    labels: crossbreedItems.map((item) => item.name),
                    datasets: [
                      {
                        data: crossbreedItems.map((item) => item.share),
                        backgroundColor: crossbreedItems.map((item) => item.color),
                        borderColor: chart.card,
                        borderWidth: 3,
                        hoverOffset: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const item = crossbreedItems[context.dataIndex];
                            return item
                              ? `${item.name}: ${item.share}% ${t('heritage.winShare').toLowerCase()} · ${item.wins}W-${item.losses}L`
                              : '';
                          },
                        },
                      },
                    },
                  }}
                />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-card-foreground text-xl font-black">
                    {decidedCount > 0 ? `${winRatePct}%` : '—%'}
                  </span>
                  <span className="text-muted-foreground text-xs font-black tracking-wider uppercase">
                    {t('heritage.winRateTrend')}
                  </span>
                </div>
              </div>
              <ul className="space-y-1.5">
                {crossbreedItems.map((item) => {
                  const decided = item.wins + item.losses;
                  return (
                    <li
                      key={item.label}
                      className="flex min-w-0 items-center gap-2 text-xs font-semibold"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-foreground min-w-0 flex-1 break-words">
                        {item.name}
                      </span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {decided > 0 ? `${item.share}%` : '—'}
                      </span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {decided > 0
                          ? `${item.winRate}% · ${t('heritage.fights', { count: item.total })}`
                          : t('heritage.noFights')}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-muted-foreground mt-3 text-center text-xs font-semibold">
                {t('heritage.smallSampleNote')}
              </p>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <PieChart className="text-muted-foreground mb-2 h-8 w-8" aria-hidden="true" />
              <p className="text-card-foreground mt-2 text-sm font-black">
                {t('heritage.noFights')}
              </p>
            </div>
          )}
        </section>

        <section className="border-border bg-card min-w-0 overflow-hidden rounded-2xl border shadow-sm xl:col-span-8">
          <div className="border-border flex flex-wrap items-start justify-between gap-2 border-b p-4 sm:p-5">
            <div className="min-w-0">
              <h3 className="text-card-foreground text-base font-black">
                {t('heritage.historicalMatches')}
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs font-semibold">
                {t('heritage.recentMatches')}
              </p>
              {unlinkedCount > 0 && (
                <p className="text-low-sample mt-1 text-xs font-bold" role="status">
                  {t('heritage.warningNoMatch')}:{' '}
                  {t('heritage.warningNoMatchDesc', { count: unlinkedCount })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate('profiling', 'matchForm')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-11 cursor-pointer items-center rounded-xl px-3.5 text-xs font-black"
            >
              {t('heritage.viewAllRecords')}
            </button>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            <MatchLogsTable
              matches={recentCockMatches}
              emptyText={t('heritage.noMatches')}
              returnTo="/dashboard"
            />
          </div>
        </section>
      </div>

      {pairingAnalytics.ranked.length > 0 && (
        <BreedingPairPerformanceAnalytics ranked={pairingAnalytics.ranked} />
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  caption,
  watermark,
  badge,
  tone = 'red',
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  caption: string;
  watermark: React.ReactNode;
  badge?: string;
  tone?: 'red' | 'orange' | 'gold';
  onClick: () => void;
}) {
  const toneClass =
    tone === 'orange'
      ? 'bg-brand-orange/15 text-brand-orange'
      : tone === 'gold'
        ? 'bg-low-sample-bg text-low-sample'
        : 'bg-accent-soft text-accent';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${DASHBOARD_KPI_CARD} border-border bg-card group relative min-h-full min-w-0 cursor-pointer overflow-hidden rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <span
        aria-hidden="true"
        className={`${DASHBOARD_KPI_CAPTION} pointer-events-none absolute -right-3 -bottom-4 opacity-[0.06]`}
      >
        {watermark}
      </span>
      <div className="flex items-start justify-between gap-2">
        <span
          className={`${DASHBOARD_KPI_LABEL} text-muted-foreground font-black tracking-wider uppercase`}
        >
          {label}
        </span>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span className={`${DASHBOARD_KPI_VALUE} text-card-foreground font-black tabular-nums`}>
          {value}
        </span>
        {badge && (
          <span className="bg-low-sample-bg text-low-sample rounded-full px-2 py-0.5 text-xs font-black uppercase">
            {badge}
          </span>
        )}
      </div>
      <p
        className={`${DASHBOARD_KPI_CAPTION} text-muted-foreground mt-1 font-semibold break-words`}
      >
        {caption}
      </p>
    </button>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-2">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="bg-accent-soft text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-card-foreground text-sm font-black break-words">{title}</h3>
          {subtitle && (
            <p className="text-muted-foreground mt-0.5 text-xs font-semibold break-words">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
