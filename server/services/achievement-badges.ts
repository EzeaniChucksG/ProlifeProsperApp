/**
 * Achievement Badges Service
 * Calculates and awards achievement badges to donors based on their donation behavior
 */

export interface AchievementBadge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface DonorStats {
  totalDonated: number;
  donationCount: number;
  firstDonationAt: Date | null;
  lastDonationAt: Date | null;
}

// Achievement badge definitions
const ACHIEVEMENT_DEFINITIONS: AchievementBadge[] = [
  // First donation
  { id: 'first_gift', emoji: '🎁', name: 'First Gift', description: 'Made your first donation', rarity: 'common' },
  
  // Donation count milestones
  { id: 'frequent_giver_3', emoji: '🔄', name: 'Repeat Supporter', description: 'Made 3+ donations', rarity: 'common' },
  { id: 'frequent_giver_5', emoji: '🌱', name: 'Growing Supporter', description: 'Made 5+ donations', rarity: 'uncommon' },
  { id: 'frequent_giver_10', emoji: '🔥', name: 'Committed Champion', description: 'Made 10+ donations', rarity: 'uncommon' },
  { id: 'frequent_giver_25', emoji: '💫', name: 'Devoted Advocate', description: 'Made 25+ donations', rarity: 'rare' },
  { id: 'frequent_giver_50', emoji: '⭐', name: 'Steadfast Partner', description: 'Made 50+ donations', rarity: 'epic' },
  { id: 'frequent_giver_100', emoji: '🌟', name: 'Century Supporter', description: 'Made 100+ donations', rarity: 'legendary' },
  
  // Total donated amount milestones
  { id: 'generous_giver_100', emoji: '💚', name: 'Generous Giver', description: 'Donated $100+', rarity: 'common' },
  { id: 'generous_giver_250', emoji: '🌿', name: 'Caring Contributor', description: 'Donated $250+', rarity: 'uncommon' },
  { id: 'generous_giver_500', emoji: '💎', name: 'Diamond Supporter', description: 'Donated $500+', rarity: 'uncommon' },
  { id: 'generous_giver_1000', emoji: '🥇', name: 'Bronze Guardian', description: 'Donated $1,000+', rarity: 'rare' },
  { id: 'generous_giver_2500', emoji: '🏅', name: 'Silver Guardian', description: 'Donated $2,500+', rarity: 'rare' },
  { id: 'generous_giver_5000', emoji: '🏆', name: 'Gold Champion', description: 'Donated $5,000+', rarity: 'epic' },
  { id: 'generous_giver_10000', emoji: '👑', name: 'Platinum Benefactor', description: 'Donated $10,000+', rarity: 'legendary' },
  { id: 'generous_giver_25000', emoji: '💫', name: 'Diamond Elite', description: 'Donated $25,000+', rarity: 'legendary' },
  
  // Time-based achievements
  { id: 'one_month_supporter', emoji: '📅', name: 'New Supporter', description: 'Supporting for 1+ month', rarity: 'common' },
  { id: 'three_month_supporter', emoji: '🗓️', name: 'Consistent Contributor', description: 'Supporting for 3+ months', rarity: 'uncommon' },
  { id: 'six_month_supporter', emoji: '📆', name: 'Sustained Partner', description: 'Supporting for 6+ months', rarity: 'uncommon' },
  { id: 'one_year_supporter', emoji: '🎂', name: 'Anniversary Supporter', description: 'Supporting for 1+ year', rarity: 'rare' },
  { id: 'two_year_supporter', emoji: '🎉', name: 'Two-Year Champion', description: 'Supporting for 2+ years', rarity: 'epic' },
  { id: 'five_year_supporter', emoji: '🌟', name: 'Legacy Supporter', description: 'Supporting for 5+ years', rarity: 'legendary' },
  
  // Special combination achievements
  { id: 'super_supporter', emoji: '🦸', name: 'Super Supporter', description: '10+ donations & $500+ total', rarity: 'rare' },
  { id: 'life_defender', emoji: '❤️', name: 'Life Defender', description: 'Supporting pro-life mission', rarity: 'uncommon' },
  { id: 'guardian_angel', emoji: '👼', name: 'Guardian Angel', description: 'Major pro-life supporter', rarity: 'rare' },
  { id: 'big_impact_maker', emoji: '💥', name: 'Big Impact Maker', description: 'High-value supporter', rarity: 'rare' },
];

/**
 * Calculate which achievement badges a donor has earned
 */
export function calculateAchievementBadges(stats: DonorStats): AchievementBadge[] {
  const badges: AchievementBadge[] = [];
  
  const total = stats.totalDonated;
  const count = stats.donationCount;
  const firstDonation = stats.firstDonationAt;
  
  // Calculate months since first donation
  let monthsSinceFirst = 0;
  if (firstDonation) {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - firstDonation.getTime());
    monthsSinceFirst = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
  }
  
  // First donation badge
  if (count >= 1) {
    badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'first_gift')!);
  }
  
  // Donation count badges (get highest earned)
  if (count >= 100) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'frequent_giver_100')!);
  else if (count >= 50) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'frequent_giver_50')!);
  else if (count >= 25) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'frequent_giver_25')!);
  else if (count >= 10) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'frequent_giver_10')!);
  else if (count >= 5) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'frequent_giver_5')!);
  else if (count >= 3) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'frequent_giver_3')!);
  
  // Total donated badges (get highest earned)
  if (total >= 25000) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'generous_giver_25000')!);
  else if (total >= 10000) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'generous_giver_10000')!);
  else if (total >= 5000) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'generous_giver_5000')!);
  else if (total >= 2500) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'generous_giver_2500')!);
  else if (total >= 1000) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'generous_giver_1000')!);
  else if (total >= 500) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'generous_giver_500')!);
  else if (total >= 250) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'generous_giver_250')!);
  else if (total >= 100) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'generous_giver_100')!);
  
  // Time-based badges (get highest earned)
  if (monthsSinceFirst >= 60) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'five_year_supporter')!);
  else if (monthsSinceFirst >= 24) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'two_year_supporter')!);
  else if (monthsSinceFirst >= 12) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'one_year_supporter')!);
  else if (monthsSinceFirst >= 6) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'six_month_supporter')!);
  else if (monthsSinceFirst >= 3) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'three_month_supporter')!);
  else if (monthsSinceFirst >= 1) badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'one_month_supporter')!);
  
  // Special combination badges
  if (count >= 10 && total >= 500) {
    badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'super_supporter')!);
  }
  
  // Pro-life specific badges
  if (total >= 100) {
    badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'life_defender')!);
  }
  
  if (total >= 1000) {
    badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'guardian_angel')!);
  }
  
  if (total >= 5000) {
    badges.push(ACHIEVEMENT_DEFINITIONS.find(b => b.id === 'big_impact_maker')!);
  }
  
  return badges;
}

/**
 * Get all achievement badge definitions
 */
export function getAllAchievementBadges(): AchievementBadge[] {
  return ACHIEVEMENT_DEFINITIONS;
}
