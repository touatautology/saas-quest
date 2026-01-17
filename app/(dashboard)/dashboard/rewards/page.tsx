'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import useSWR from 'swr';
import {
  Trophy,
  Coins,
  Gift,
  Award,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';
import { getLocalizedText, LocalizedText } from '@/lib/i18n';

type Reward = {
  id: number;
  slug: string;
  title: LocalizedText;
  description: LocalizedText | null;
  type: 'badge' | 'coin' | 'perk';
  value: number | null;
  iconUrl: string | null;
  conditionType: string;
  isActive: boolean;
  earned: boolean;
  earnedAt: string | null;
};

type RewardsData = {
  rewards: Reward[];
};

type CurrencyData = {
  coins: number;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// リワードタイプごとのアイコン
function RewardTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'badge':
      return <Award className={className} />;
    case 'coin':
      return <Coins className={className} />;
    case 'perk':
      return <Gift className={className} />;
    default:
      return <Trophy className={className} />;
  }
}

// バッジカード
function BadgeCard({ reward }: { reward: Reward }) {
  const { locale } = useLocale();
  const title = getLocalizedText(reward.title, locale);
  const description = getLocalizedText(reward.description, locale);

  return (
    <div
      className={`relative flex flex-col items-center p-4 rounded-lg border transition-all ${
        reward.earned
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
          : 'bg-gray-50 border-gray-200 opacity-60'
      }`}
    >
      {/* アイコン */}
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
          reward.earned ? 'bg-amber-100' : 'bg-gray-100'
        }`}
      >
        {reward.iconUrl ? (
          <img src={reward.iconUrl} alt={title} className="w-10 h-10" />
        ) : (
          <Award
            className={`w-8 h-8 ${reward.earned ? 'text-amber-500' : 'text-gray-400'}`}
          />
        )}
      </div>

      {/* ステータスバッジ */}
      <div className="absolute top-2 right-2">
        {reward.earned ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Lock className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* タイトル */}
      <h4 className={`font-medium text-sm text-center ${reward.earned ? 'text-amber-900' : 'text-gray-500'}`}>
        {title}
      </h4>

      {/* 説明 */}
      {description && (
        <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
          {description}
        </p>
      )}

      {/* 獲得日 */}
      {reward.earned && reward.earnedAt && (
        <p className="text-xs text-amber-600 mt-2">
          {new Date(reward.earnedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

// 特典カード
function PerkCard({ reward }: { reward: Reward }) {
  const { locale, t } = useLocale();
  const title = getLocalizedText(reward.title, locale);
  const description = getLocalizedText(reward.description, locale);

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
        reward.earned
          ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
          : 'bg-gray-50 border-gray-200 opacity-60'
      }`}
    >
      {/* アイコン */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          reward.earned ? 'bg-purple-100' : 'bg-gray-100'
        }`}
      >
        {reward.iconUrl ? (
          <img src={reward.iconUrl} alt={title} className="w-6 h-6" />
        ) : (
          <Gift className={`w-6 h-6 ${reward.earned ? 'text-purple-500' : 'text-gray-400'}`} />
        )}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium ${reward.earned ? 'text-purple-900' : 'text-gray-500'}`}>
          {title}
        </h4>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
        )}
      </div>

      {/* ステータス */}
      <div className="flex-shrink-0">
        {reward.earned ? (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
            {t('rewards.earned')}
          </Badge>
        ) : (
          <Badge variant="secondary">
            <Lock className="w-3 h-3 mr-1" />
            {t('rewards.locked')}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function RewardsPage() {
  const { t } = useLocale();
  const { data: rewardsData, isLoading: rewardsLoading } = useSWR<RewardsData>('/api/rewards', fetcher);
  const { data: currencyData, isLoading: currencyLoading } = useSWR<CurrencyData>('/api/rewards/currency', fetcher);

  const isLoading = rewardsLoading || currencyLoading;

  if (isLoading) {
    return (
      <section className="flex-1 p-4 lg:p-6">
        <div className="space-y-4">
          <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-12 bg-gray-100 rounded animate-pulse" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const rewards = rewardsData?.rewards || [];
  const coins = currencyData?.coins || 0;

  // タイプ別にグループ化
  const badges = rewards.filter((r) => r.type === 'badge');
  const perks = rewards.filter((r) => r.type === 'perk');
  const earnedBadges = badges.filter((r) => r.earned);
  const earnedPerks = perks.filter((r) => r.earned);

  return (
    <section className="flex-1 p-4 lg:p-6 space-y-6">
      {/* コイン表示 */}
      <Card className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-amber-200">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Coins className="w-8 h-8 text-amber-500" />
            </div>
            <div className="text-center">
              <p className="text-sm text-amber-700 font-medium">{t('rewards.coins')}</p>
              <p className="text-4xl font-bold text-amber-900">{coins.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* バッジセクション */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <CardTitle>{t('rewards.badges')}</CardTitle>
            </div>
            <Badge variant="secondary">
              {earnedBadges.length}/{badges.length}
            </Badge>
          </div>
          <CardDescription>
            {t('rewards.badgesDescription') || 'Collect badges by completing quests and challenges'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {badges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {badges.map((badge) => (
                <BadgeCard key={badge.id} reward={badge} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('rewards.noRewards')}</p>
          )}
        </CardContent>
      </Card>

      {/* 特典セクション */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-500" />
              <CardTitle>{t('rewards.perks')}</CardTitle>
            </div>
            <Badge variant="secondary">
              {earnedPerks.length}/{perks.length}
            </Badge>
          </div>
          <CardDescription>
            {t('rewards.perksDescription') || 'Unlock special features and bonuses'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {perks.length > 0 ? (
            <div className="space-y-3">
              {perks.map((perk) => (
                <PerkCard key={perk.id} reward={perk} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('rewards.noRewards')}</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
