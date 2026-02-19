import { AccessToken, RtcRole } from "agora-access-token";
import { db } from "../../db";
import { videoCalls, videoCallParticipants, users } from "@eat/shared/schema";
import { eq, and } from "drizzle-orm";
import { config } from "../../config";

const AGORA_TOKEN_EXPIRATION = 24 * 60 * 60; // 24 hours in seconds

export interface GenerateTokenParams {
  userId: string;
  channelName: string;
  role?: "publisher" | "subscriber";
}

export interface CreateChannelParams {
  hostUserId: string;
  callType: "one_on_one" | "group";
  participantUserIds?: string[];
}

export interface EndCallParams {
  callId: string;
  recordingUrl?: string;
}

export interface AgoraTokenResponse {
  token: string;
  channelName: string;
  appId: string;
  uid: string;
  expiresIn: number;
}

export class AgoraService {
  private appId: string;
  private appCertificate: string;

  constructor() {
    this.appId = config.agoraAppId;
    this.appCertificate = config.agoraAppCertificate;

    if (!this.appId || !this.appCertificate) {
      throw new Error(
        "Agora credentials not configured: AGORA_APP_ID and AGORA_APP_CERTIFICATE required"
      );
    }
  }

  /**
   * Generate an Agora access token for a user to join a channel
   */
  async generateToken(params: GenerateTokenParams): Promise<AgoraTokenResponse> {
    try {
      const { userId, channelName, role = "publisher" } = params;

      // Validate inputs
      if (!userId) throw new Error("User ID required");
      if (!channelName) throw new Error("Channel name required");

      // Verify user exists
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error("User not found");
      }

      // Generate token with user ID as numeric UID
      const uid = parseInt(userId.replace(/\D/g, "0")) || 0;
      const rtcRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

      const token = new AccessToken(
        this.appId,
        this.appCertificate,
        channelName,
        uid
      );

      token.addRtcService(rtcRole);
      token.expire(AGORA_TOKEN_EXPIRATION);

      const tokenString = token.build();

      return {
        token: tokenString,
        channelName,
        appId: this.appId,
        uid: uid.toString(),
        expiresIn: AGORA_TOKEN_EXPIRATION,
      };
    } catch (error) {
      console.error("Generate token failed:", { error, params });
      throw new Error(
        error instanceof Error ? error.message : "Failed to generate Agora token"
      );
    }
  }

  /**
   * Create a video call channel and insert into database
   */
  async createChannel(params: CreateChannelParams): Promise<{
    callId: string;
    channelName: string;
    token: string;
  }> {
    try {
      const { hostUserId, callType, participantUserIds = [] } = params;

      // Validate inputs
      if (!hostUserId) throw new Error("Host user ID required");
      if (!callType) throw new Error("Call type required");

      // Verify host exists
      const host = await db
        .select()
        .from(users)
        .where(eq(users.id, hostUserId))
        .limit(1);

      if (host.length === 0) {
        throw new Error("Host user not found");
      }

      // Generate unique channel name
      const timestamp = Date.now();
      const channelName = `call_${hostUserId}_${timestamp}`;

      // Insert video call record
      const insertResult = await db
        .insert(videoCalls)
        .values({
          hostUserId,
          callType,
          channelName,
          status: "initiated",
        })
        .returning();

      const callId = insertResult[0]?.id;
      if (!callId) {
        throw new Error("Failed to create video call record");
      }

      // Add host as first participant
      await db.insert(videoCallParticipants).values({
        callId,
        userId: hostUserId,
      });

      // Add other participants
      if (participantUserIds.length > 0) {
        const validParticipantIds = participantUserIds.filter(
          (id) => id !== hostUserId
        );

        if (validParticipantIds.length > 0) {
          // Verify all participants exist
          const existingParticipants = await db
            .select({ id: users.id })
            .from(users)
            .where(
              and(
                eq(users.isDeleted, false),
                eq(users.isBanned, false)
              )
            );

          const existingIds = new Set(existingParticipants.map((u) => u.id));

          const validIds = validParticipantIds.filter((id) =>
            existingIds.has(id)
          );

          if (validIds.length > 0) {
            await db.insert(videoCallParticipants).values(
              validIds.map((userId) => ({
                callId,
                userId,
              }))
            );
          }
        }
      }

      // Generate token for host
      const tokenResponse = await this.generateToken({
        userId: hostUserId,
        channelName,
        role: "publisher",
      });

      return {
        callId,
        channelName,
        token: tokenResponse.token,
      };
    } catch (error) {
      console.error("Create channel failed:", { error, params });
      throw new Error(
        error instanceof Error ? error.message : "Failed to create video channel"
      );
    }
  }

  /**
   * End a video call and update database
   */
  async endCall(params: EndCallParams): Promise<{
    callId: string;
    duration: number;
  }> {
    try {
      const { callId, recordingUrl } = params;

      // Validate inputs
      if (!callId) throw new Error("Call ID required");

      // Get call record
      const callRecord = await db
        .select()
        .from(videoCalls)
        .where(eq(videoCalls.id, callId))
        .limit(1);

      if (callRecord.length === 0) {
        throw new Error("Video call not found");
      }

      const call = callRecord[0];
      const endedAt = new Date();
      const startedAt = call.startedAt || new Date();
      const duration = Math.floor(
        (endedAt.getTime() - startedAt.getTime()) / 1000
      );

      // Update call record
      await db
        .update(videoCalls)
        .set({
          status: "ended",
          endedAt,
          duration,
          recordingUrl,
          updatedAt: endedAt,
        })
        .where(eq(videoCalls.id, callId));

      // Update participant left times
      const participants = await db
        .select()
        .from(videoCallParticipants)
        .where(
          and(
            eq(videoCallParticipants.callId, callId),
            eq(videoCallParticipants.leftAt, null)
          )
        );

      if (participants.length > 0) {
        await db
          .update(videoCallParticipants)
          .set({ leftAt: endedAt })
          .where(
            and(
              eq(videoCallParticipants.callId, callId),
              eq(videoCallParticipants.leftAt, null)
            )
          );
      }

      return {
        callId,
        duration,
      };
    } catch (error) {
      console.error("End call failed:", { error, params });
      throw new Error(
        error instanceof Error ? error.message : "Failed to end video call"
      );
    }
  }

  /**
   * Get token for a user to join an existing channel
   */
  async joinChannel(
    channelName: string,
    userId: string
  ): Promise<AgoraTokenResponse> {
    try {
      // Validate inputs
      if (!channelName) throw new Error("Channel name required");
      if (!userId) throw new Error("User ID required");

      // Verify user exists
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error("User not found");
      }

      // Get or create participant record
      const callRecord = await db
        .select()
        .from(videoCalls)
        .where(eq(videoCalls.channelName, channelName))
        .limit(1);

      if (callRecord.length === 0) {
        throw new Error("Channel not found");
      }

      const callId = callRecord[0].id;

      // Check if user is already a participant
      const existingParticipant = await db
        .select()
        .from(videoCallParticipants)
        .where(
          and(
            eq(videoCallParticipants.callId, callId),
            eq(videoCallParticipants.userId, userId)
          )
        )
        .limit(1);

      // Add as participant if not already added
      if (existingParticipant.length === 0) {
        await db.insert(videoCallParticipants).values({
          callId,
          userId,
        });
      }

      // Generate token
      return this.generateToken({
        userId,
        channelName,
        role: "publisher",
      });
    } catch (error) {
      console.error("Join channel failed:", { error, channelName, userId });
      throw new Error(
        error instanceof Error ? error.message : "Failed to join video channel"
      );
    }
  }

  /**
   * Get call details and participants
   */
  async getCallDetails(callId: string): Promise<{
    call: any;
    participants: any[];
  }> {
    try {
      if (!callId) throw new Error("Call ID required");

      const callRecord = await db
        .select()
        .from(videoCalls)
        .where(eq(videoCalls.id, callId))
        .limit(1);

      if (callRecord.length === 0) {
        throw new Error("Video call not found");
      }

      const participants = await db
        .select()
        .from(videoCallParticipants)
        .where(eq(videoCallParticipants.callId, callId));

      return {
        call: callRecord[0],
        participants,
      };
    } catch (error) {
      console.error("Get call details failed:", { error, callId });
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to get video call details"
      );
    }
  }

  /**
   * Mark participant as left the call
   */
  async markParticipantLeft(
    callId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    try {
      if (!callId) throw new Error("Call ID required");
      if (!userId) throw new Error("User ID required");

      await db
        .update(videoCallParticipants)
        .set({ leftAt: new Date() })
        .where(
          and(
            eq(videoCallParticipants.callId, callId),
            eq(videoCallParticipants.userId, userId),
            eq(videoCallParticipants.leftAt, null)
          )
        );

      return { success: true };
    } catch (error) {
      console.error("Mark participant left failed:", { error, callId, userId });
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to mark participant left"
      );
    }
  }

  /**
   * Update participant media status
   */
  async updateParticipantMedia(
    callId: string,
    userId: string,
    isMuted: boolean,
    isVideoOn: boolean
  ): Promise<{ success: boolean }> {
    try {
      if (!callId) throw new Error("Call ID required");
      if (!userId) throw new Error("User ID required");

      await db
        .update(videoCallParticipants)
        .set({ isMuted, isVideoOn })
        .where(
          and(
            eq(videoCallParticipants.callId, callId),
            eq(videoCallParticipants.userId, userId)
          )
        );

      return { success: true };
    } catch (error) {
      console.error("Update participant media failed:", {
        error,
        callId,
        userId,
      });
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to update participant media status"
      );
    }
  }
}

// Export singleton instance
export const agoraService = new AgoraService();
