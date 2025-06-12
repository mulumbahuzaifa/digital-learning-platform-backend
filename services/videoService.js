const axios = require("axios");
const config = require("../config/config");

class VideoService {
  constructor() {
    this.apiKey = config.videoService.apiKey;
    this.apiSecret = config.videoService.apiSecret;
    this.baseUrl = config.videoService.baseUrl;
  }

  // Create a new meeting
  async createMeeting(session) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/users/me/meetings`,
        {
          topic: session.title,
          type: 2, // Scheduled meeting
          start_time: session.startTime,
          duration: session.duration,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: true,
            meeting_authentication: true,
            encryption_type: "enhanced_encryption",
            breakout_room: {
              enable: true,
              rooms: [],
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        meetingId: response.data.id,
        joinUrl: response.data.join_url,
        password: response.data.password,
      };
    } catch (error) {
      console.error("Error creating meeting:", error);
      throw new Error("Failed to create video meeting");
    }
  }

  // Get meeting details
  async getMeeting(meetingId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/meetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error getting meeting:", error);
      throw new Error("Failed to get meeting details");
    }
  }

  // Update meeting
  async updateMeeting(meetingId, updates) {
    try {
      const response = await axios.patch(
        `${this.baseUrl}/meetings/${meetingId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error updating meeting:", error);
      throw new Error("Failed to update meeting");
    }
  }

  // Delete meeting
  async deleteMeeting(meetingId) {
    try {
      await axios.delete(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return true;
    } catch (error) {
      console.error("Error deleting meeting:", error);
      throw new Error("Failed to delete meeting");
    }
  }

  // Get meeting participants
  async getParticipants(meetingId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/meetings/${meetingId}/participants`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );
      return response.data.participants;
    } catch (error) {
      console.error("Error getting participants:", error);
      throw new Error("Failed to get meeting participants");
    }
  }

  // End meeting
  async endMeeting(meetingId) {
    try {
      await axios.put(
        `${this.baseUrl}/meetings/${meetingId}/status`,
        { action: "end" },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );
      return true;
    } catch (error) {
      console.error("Error ending meeting:", error);
      throw new Error("Failed to end meeting");
    }
  }

  // Get meeting recordings
  async getRecordings(meetingId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/meetings/${meetingId}/recordings`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );
      return response.data.recording_files;
    } catch (error) {
      console.error("Error getting recordings:", error);
      throw new Error("Failed to get meeting recordings");
    }
  }
}

module.exports = new VideoService();
