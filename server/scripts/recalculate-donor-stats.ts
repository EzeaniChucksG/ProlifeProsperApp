/**
 * Script to recalculate donor statistics from their donations
 * Run with: npx tsx server/scripts/recalculate-donor-stats.ts
 */
import { db } from "../db";
import { donors, donations } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { calculateAchievementBadges } from "../services/achievement-badges";

async function recalculateDonorStats() {
  try {
    console.log("🔄 Starting donor statistics recalculation...");
    
    // Get all unique donor IDs from donations
    const donorStats = await db
      .select({
        donorId: donations.donorId,
        totalDonated: sql<number>`SUM(CAST(${donations.amount} AS DECIMAL))`,
        donationCount: sql<number>`COUNT(*)`,
        firstDonationAt: sql<Date>`MIN(${donations.createdAt})`,
        lastDonationAt: sql<Date>`MAX(${donations.createdAt})`,
      })
      .from(donations)
      .where(eq(donations.status, "completed"))
      .groupBy(donations.donorId);
    
    console.log(`📊 Found ${donorStats.length} donors with donations`);
    
    let updated = 0;
    let errors = 0;
    
    // Update each donor with their calculated stats
    for (const stats of donorStats) {
      try {
        const firstDonation = stats.firstDonationAt ? new Date(stats.firstDonationAt) : null;
        const lastDonation = stats.lastDonationAt ? new Date(stats.lastDonationAt) : null;
        
        // Calculate achievement badges
        const achievementBadges = calculateAchievementBadges({
          totalDonated: stats.totalDonated,
          donationCount: stats.donationCount,
          firstDonationAt: firstDonation,
          lastDonationAt: lastDonation,
        });
        
        await db
          .update(donors)
          .set({
            totalDonated: stats.totalDonated.toString(),
            donationCount: stats.donationCount,
            firstDonationAt: firstDonation,
            lastDonationAt: lastDonation,
            achievementBadges: achievementBadges as any,
            updatedAt: new Date(),
          })
          .where(eq(donors.id, stats.donorId));
        
        updated++;
        console.log(`✅ Updated donor ${stats.donorId}: $${stats.totalDonated}, ${stats.donationCount} donations, ${achievementBadges.length} badges`);
      } catch (error) {
        errors++;
        console.error(`❌ Error updating donor ${stats.donorId}:`, error);
      }
    }
    
    console.log(`\n🎉 Donor stats recalculation complete!`);
    console.log(`   - Total donors found: ${donorStats.length}`);
    console.log(`   - Successfully updated: ${updated}`);
    console.log(`   - Errors: ${errors}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error recalculating donor stats:", error);
    process.exit(1);
  }
}

recalculateDonorStats();
