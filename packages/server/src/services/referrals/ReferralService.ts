import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  vendorReferrals,
  creditTransactions,
  vendors,
  users
} from "../../schema";
import type {
  VendorReferral,
  InsertVendorReferral,
  CreditTransaction
} from "../../schema";

/**
 * ReferralService - Manages vendor referral system
 * - Generates unique referral codes (8 chars, alphanumeric)
 * - Tracks referrals in vendorReferrals table
 * - Calculates commissions (2% recurring)
 * - Awards credits: 200 for referrer, 100 for new vendor
 * - Handles monthly payout jobs
 */
export class ReferralService {
  private static readonly MEMBER_REFERRAL_REFERRER_CREDITS = 50;
  private static readonly MEMBER_REFERRAL_REFEREE_CREDITS = 25;
  private static readonly VENDOR_REFERRAL_REFERRER_CREDITS = 200;
  private static readonly VENDOR_REFERRAL_REFEREE_CREDITS = 100;
  private static readonly RECURRING_COMMISSION_RATE = 0.02; // 2%
  private static readonly REFERRAL_CODE_LENGTH = 8;
  private static readonly REFERRAL_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  /**
   * Generates a unique 8-character alphanumeric referral code
   * @returns Unique referral code
   */
  static async createReferralCode(): Promise<string> {
    try {
      let referralCode: string;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        // Generate random 8-char alphanumeric code
        referralCode = Array.from(
          { length: this.REFERRAL_CODE_LENGTH },
          () => this.REFERRAL_CODE_CHARS.charAt(
            Math.floor(Math.random() * this.REFERRAL_CODE_CHARS.length)
          )
        ).join("");

        // Check uniqueness
        const existing = await db
          .select()
          .from(vendorReferrals)
          .where(eq(vendorReferrals.referralCode, referralCode))
          .limit(1);

        if (existing.length === 0) {
          isUnique = true;
          return referralCode;
        }

        attempts++;
      }

      throw new Error("Failed to generate unique referral code after max attempts");
    } catch (error) {
      console.error("Error creating referral code:", error);
      throw new Error(`Failed to create referral code: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Tracks a new vendor referral and awards initial credits
   * @param referrerVendorId - ID of the referring vendor
   * @param referredVendorId - ID of the newly referred vendor
   * @param referralCode - The referral code used
   * @returns Created referral record
   */
  static async trackReferral(
    referrerVendorId: string,
    referredVendorId: string,
    referralCode: string
  ): Promise<VendorReferral> {
    try {
      // Validate inputs
      if (!referrerVendorId || !referredVendorId || !referralCode) {
        throw new Error("All parameters are required: referrerVendorId, referredVendorId, referralCode");
      }

      if (referrerVendorId === referredVendorId) {
        throw new Error("Vendors cannot refer themselves");
      }

      // Verify both vendors exist
      const [referrerVendor, referredVendor] = await Promise.all([
        db.select().from(vendors).where(eq(vendors.id, referrerVendorId)).limit(1),
        db.select().from(vendors).where(eq(vendors.id, referredVendorId)).limit(1)
      ]);

      if (referrerVendor.length === 0) {
        throw new Error(`Referrer vendor not found: ${referrerVendorId}`);
      }

      if (referredVendor.length === 0) {
        throw new Error(`Referred vendor not found: ${referredVendorId}`);
      }

      // Check if referral already exists
      const existingReferral = await db
        .select()
        .from(vendorReferrals)
        .where(eq(vendorReferrals.referredVendorId, referredVendorId))
        .limit(1);

      if (existingReferral.length > 0) {
        throw new Error("Vendor has already been referred");
      }

      // Create referral record
      const [newReferral] = await db
        .insert(vendorReferrals)
        .values({
          referrerVendorId,
          referredVendorId,
          referralCode,
          status: "active",
          conversionDate: new Date(),
          recurringCommissionRate: this.RECURRING_COMMISSION_RATE,
          totalEarnings: 0,
        })
        .returning();

      // Award initial credits to both vendors
      await this.awardInitialCredits(
        referrerVendor[0].linkedUserId,
        referredVendor[0].linkedUserId,
        newReferral.id
      );

      console.info("Vendor referral tracked successfully", {
        referralId: newReferral.id,
        referrerVendorId,
        referredVendorId
      });

      return newReferral;
    } catch (error) {
      console.error("Error tracking referral:", error);
      throw new Error(`Failed to track referral: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Awards initial credits to referrer and referred vendors
   * @param referrerUserId - User ID of referrer vendor
   * @param referredUserId - User ID of referred vendor
   * @param referralId - ID of the referral record
   */
  private static async awardInitialCredits(
    referrerUserId: string | null,
    referredUserId: string | null,
    referralId: string
  ): Promise<void> {
    try {
      if (referrerUserId) {
        // Award credits to referrer
        await db.insert(creditTransactions).values({
          userId: referrerUserId,
          type: "referral_bonus",
          amount: this.VENDOR_REFERRAL_REFERRER_CREDITS,
          description: "Vendor referral bonus - referrer",
          relatedEntityType: "vendor_referral",
          relatedEntityId: referralId,
        });

        // Update user credit balance
        await db
          .update(users)
          .set({
            creditBalance: sql`${users.creditBalance} + ${this.VENDOR_REFERRAL_REFERRER_CREDITS}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, referrerUserId));

        console.info("Awarded referrer credits", {
          userId: referrerUserId,
          amount: this.VENDOR_REFERRAL_REFERRER_CREDITS
        });
      }

      if (referredUserId) {
        // Award credits to referred vendor
        await db.insert(creditTransactions).values({
          userId: referredUserId,
          type: "referral_bonus",
          amount: this.VENDOR_REFERRAL_REFEREE_CREDITS,
          description: "Vendor referral bonus - new vendor",
          relatedEntityType: "vendor_referral",
          relatedEntityId: referralId,
        });

        // Update user credit balance
        await db
          .update(users)
          .set({
            creditBalance: sql`${users.creditBalance} + ${this.VENDOR_REFERRAL_REFEREE_CREDITS}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, referredUserId));

        console.info("Awarded referred vendor credits", {
          userId: referredUserId,
          amount: this.VENDOR_REFERRAL_REFEREE_CREDITS
        });
      }
    } catch (error) {
      console.error("Error awarding initial credits:", error);
      throw new Error(`Failed to award initial credits: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Calculates commission for a specific referral based on sales amount
   * @param referralId - ID of the referral
   * @param salesAmount - Total sales amount for the period
   * @returns Commission amount
   */
  static async calculateCommission(
    referralId: string,
    salesAmount: number
  ): Promise<number> {
    try {
      if (!referralId || salesAmount < 0) {
        throw new Error("Valid referralId and non-negative salesAmount required");
      }

      // Get referral record
      const [referral] = await db
        .select()
        .from(vendorReferrals)
        .where(eq(vendorReferrals.id, referralId))
        .limit(1);

      if (!referral) {
        throw new Error(`Referral not found: ${referralId}`);
      }

      if (referral.status !== "active") {
        console.warn("Cannot calculate commission for non-active referral", {
          referralId,
          status: referral.status
        });
        return 0;
      }

      // Calculate commission
      const commission = salesAmount * referral.recurringCommissionRate;

      console.info("Commission calculated", {
        referralId,
        salesAmount,
        commissionRate: referral.recurringCommissionRate,
        commission
      });

      return commission;
    } catch (error) {
      console.error("Error calculating commission:", error);
      throw new Error(`Failed to calculate commission: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Processes commission payouts for a given period (monthly job)
   * @param startDate - Start date of payout period
   * @param endDate - End date of payout period
   * @param salesData - Array of { referredVendorId, salesAmount }
   * @returns Summary of payouts processed
   */
  static async payoutCommissions(
    startDate: Date,
    endDate: Date,
    salesData: Array<{ referredVendorId: string; salesAmount: number }>
  ): Promise<{
    totalPayouts: number;
    successCount: number;
    failedCount: number;
    errors: Array<{ referredVendorId: string; error: string }>;
  }> {
    try {
      if (!startDate || !endDate) {
        throw new Error("Start date and end date are required");
      }

      if (startDate >= endDate) {
        throw new Error("Start date must be before end date");
      }

      console.info("Starting commission payout job", {
        startDate,
        endDate,
        vendorCount: salesData.length
      });

      let totalPayouts = 0;
      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ referredVendorId: string; error: string }> = [];

      // Process each vendor's sales
      for (const { referredVendorId, salesAmount } of salesData) {
        try {
          // Find active referrals for this vendor
          const referrals = await db
            .select()
            .from(vendorReferrals)
            .where(
              and(
                eq(vendorReferrals.referredVendorId, referredVendorId),
                eq(vendorReferrals.status, "active")
              )
            );

          if (referrals.length === 0) {
            continue; // No active referrals for this vendor
          }

          // Process each referral (typically only one per vendor)
          for (const referral of referrals) {
            const commission = await this.calculateCommission(referral.id, salesAmount);

            if (commission <= 0) {
              continue; // Skip if no commission
            }

            // Get referrer's user ID
            const [referrerVendor] = await db
              .select()
              .from(vendors)
              .where(eq(vendors.id, referral.referrerVendorId))
              .limit(1);

            if (!referrerVendor || !referrerVendor.linkedUserId) {
              errors.push({
                referredVendorId,
                error: "Referrer vendor has no linked user"
              });
              failedCount++;
              continue;
            }

            // Create credit transaction for commission
            await db.insert(creditTransactions).values({
              userId: referrerVendor.linkedUserId,
              type: "recurring_commission",
              amount: Math.round(commission), // Round to nearest credit
              description: `Monthly commission (${startDate.toISOString().slice(0, 7)})`,
              relatedEntityType: "vendor_referral",
              relatedEntityId: referral.id,
              recurringSourceId: referredVendorId,
            });

            // Update user credit balance
            await db
              .update(users)
              .set({
                creditBalance: sql`${users.creditBalance} + ${Math.round(commission)}`,
                updatedAt: new Date()
              })
              .where(eq(users.id, referrerVendor.linkedUserId));

            // Update referral total earnings
            await db
              .update(vendorReferrals)
              .set({
                totalEarnings: sql`${vendorReferrals.totalEarnings} + ${commission}`,
                updatedAt: new Date()
              })
              .where(eq(vendorReferrals.id, referral.id));

            totalPayouts += commission;
            successCount++;

            console.info("Commission payout completed", {
              referralId: referral.id,
              referredVendorId,
              salesAmount,
              commission
            });
          }
        } catch (error) {
          console.error("Error processing payout for vendor:", {
            referredVendorId,
            error
          });
          errors.push({
            referredVendorId,
            error: error instanceof Error ? error.message : "Unknown error"
          });
          failedCount++;
        }
      }

      const summary = {
        totalPayouts,
        successCount,
        failedCount,
        errors
      };

      console.info("Commission payout job completed", summary);

      return summary;
    } catch (error) {
      console.error("Error in payout commissions job:", error);
      throw new Error(`Failed to process commission payouts: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Awards credits for member referrals (non-vendor)
   * @param referrerUserId - User ID of the referrer
   * @param referredUserId - User ID of the new member
   * @returns Transaction IDs
   */
  static async awardMemberReferralCredits(
    referrerUserId: string,
    referredUserId: string
  ): Promise<{ referrerTxId: string; refereeTxId: string }> {
    try {
      if (!referrerUserId || !referredUserId) {
        throw new Error("Both referrer and referred user IDs are required");
      }

      if (referrerUserId === referredUserId) {
        throw new Error("Users cannot refer themselves");
      }

      // Award credits to referrer
      const [referrerTx] = await db.insert(creditTransactions).values({
        userId: referrerUserId,
        type: "referral_bonus",
        amount: this.MEMBER_REFERRAL_REFERRER_CREDITS,
        description: "Member referral bonus - referrer",
        relatedEntityType: "user",
        relatedEntityId: referredUserId,
      }).returning();

      // Update referrer credit balance
      await db
        .update(users)
        .set({
          creditBalance: sql`${users.creditBalance} + ${this.MEMBER_REFERRAL_REFERRER_CREDITS}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, referrerUserId));

      // Award credits to new member
      const [refereeTx] = await db.insert(creditTransactions).values({
        userId: referredUserId,
        type: "referral_bonus",
        amount: this.MEMBER_REFERRAL_REFEREE_CREDITS,
        description: "Member referral bonus - new member",
        relatedEntityType: "user",
        relatedEntityId: referrerUserId,
      }).returning();

      // Update new member credit balance
      await db
        .update(users)
        .set({
          creditBalance: sql`${users.creditBalance} + ${this.MEMBER_REFERRAL_REFEREE_CREDITS}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, referredUserId));

      console.info("Member referral credits awarded", {
        referrerUserId,
        referredUserId,
        referrerCredits: this.MEMBER_REFERRAL_REFERRER_CREDITS,
        refereeCredits: this.MEMBER_REFERRAL_REFEREE_CREDITS
      });

      return {
        referrerTxId: referrerTx.id,
        refereeTxId: refereeTx.id
      };
    } catch (error) {
      console.error("Error awarding member referral credits:", error);
      throw new Error(`Failed to award member referral credits: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Gets referral statistics for a vendor
   * @param vendorId - Vendor ID
   * @returns Referral statistics
   */
  static async getReferralStats(vendorId: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    referralCode: string | null;
  }> {
    try {
      if (!vendorId) {
        throw new Error("Vendor ID is required");
      }

      const referrals = await db
        .select()
        .from(vendorReferrals)
        .where(eq(vendorReferrals.referrerVendorId, vendorId));

      const activeReferrals = referrals.filter(r => r.status === "active");
      const totalEarnings = referrals.reduce((sum, r) => sum + r.totalEarnings, 0);

      // Get vendor's referral code (first one found)
      const referralCode = referrals.length > 0 ? referrals[0].referralCode : null;

      return {
        totalReferrals: referrals.length,
        activeReferrals: activeReferrals.length,
        totalEarnings,
        referralCode
      };
    } catch (error) {
      console.error("Error getting referral stats:", error);
      throw new Error(`Failed to get referral stats: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
