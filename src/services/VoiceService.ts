import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export interface VoiceRecordingOptions {
  quality?: 'low' | 'medium' | 'high';
  maxDuration?: number; // seconds
}

export interface VoicePlaybackOptions {
  volume?: number;
  rate?: number;
  pitch?: number;
}

export class VoiceService {
  private static recording: Audio.Recording | null = null;
  private static sound: Audio.Sound | null = null;
  private static isRecording = false;
  private static isPlaying = false;

  // Text-to-Speech
  static async speak(text: string, options?: VoicePlaybackOptions): Promise<void> {
    try {
      const {
        volume = 1.0,
        rate = 0.9,
        pitch = 1.0,
      } = options || {};

      await Speech.speak(text, {
        language: 'tr-TR',
        pitch,
        rate,
        volume,
        quality: Speech.VoiceQuality.Enhanced,
      });
    } catch (error) {
      console.error('TTS Error:', error);
      throw error;
    }
  }

  // Stop speaking
  static async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Stop TTS Error:', error);
    }
  }

  // Check if speaking
  static async isSpeaking(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch {
      return false;
    }
  }

  // Start recording
  static async startRecording(options?: VoiceRecordingOptions): Promise<string> {
    try {
      if (this.isRecording) {
        throw new Error('Already recording');
      }

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Create recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          // Recording status updates
          if (status.isDoneRecording) {
            this.isRecording = false;
          }
        }
      );

      this.recording = recording;
      this.isRecording = true;

      return 'Recording started';
    } catch (error) {
      console.error('Start Recording Error:', error);
      this.isRecording = false;
      throw error;
    }
  }

  // Stop recording and get URI
  static async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording || !this.isRecording) {
        throw new Error('Not recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      this.isRecording = false;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      return uri;
    } catch (error) {
      console.error('Stop Recording Error:', error);
      this.isRecording = false;
      return null;
    }
  }

  // Cancel recording
  static async cancelRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      this.isRecording = false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });
    } catch (error) {
      console.error('Cancel Recording Error:', error);
    }
  }

  // Play audio file
  static async playAudio(uri: string, options?: VoicePlaybackOptions): Promise<void> {
    try {
      if (this.isPlaying) {
        await this.stopAudio();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          volume: options?.volume || 1.0,
          rate: options?.rate || 1.0,
        }
      );

      this.sound = sound;
      this.isPlaying = true;

      // Wait for playback to finish
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.isPlaying = false;
        }
      });
    } catch (error) {
      console.error('Play Audio Error:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  // Stop audio playback
  static async stopAudio(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.isPlaying = false;
    } catch (error) {
      console.error('Stop Audio Error:', error);
    }
  }

  // Check if recording
  static getIsRecording(): boolean {
    return this.isRecording;
  }

  // Check if playing
  static getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Get recording duration (if available)
  static async getRecordingDuration(): Promise<number> {
    try {
      if (this.recording) {
        const status = await this.recording.getStatusAsync();
        if (status.isLoaded) {
          return status.durationMillis || 0;
        }
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  // Cleanup
  static async cleanup(): Promise<void> {
    try {
      await this.stopRecording();
      await this.stopAudio();
      await this.stopSpeaking();
    } catch (error) {
      console.error('Cleanup Error:', error);
    }
  }
}

