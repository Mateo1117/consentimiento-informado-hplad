/**
 * Type declarations for DigitalPersona WebSDK + Fingerprint SDK
 * loaded as IIFE globals via <script> tags.
 */

declare namespace WebSdk {
  type WebChannelOptionsData = {
    debug?: boolean;
    version?: number;
    reconnectAlways?: boolean;
    port?: number;
  };
}

declare namespace Fingerprint {
  enum SampleFormat {
    Raw = 1,
    Intermediate = 2,
    Compressed = 3,
    PngImage = 5,
  }

  enum QualityCode {
    Good = 0,
    NoImage = 1,
    TooLight = 2,
    TooDark = 3,
    TooNoisy = 4,
    LowContrast = 5,
    NotEnoughFeatures = 6,
    NotCentered = 7,
    NotAFinger = 8,
    TooHigh = 9,
    TooLow = 10,
    TooLeft = 11,
    TooRight = 12,
    TooStrange = 13,
    TooFast = 14,
    TooSkewed = 15,
    TooShort = 16,
    TooSlow = 17,
    ReverseMotion = 18,
    PressureTooHard = 19,
    PressureTooLight = 20,
    WetFinger = 21,
    FakeFinger = 22,
    TooSmall = 23,
    RotatedTooMuch = 24,
  }

  interface DeviceInfo {
    DeviceID: string;
    eUidType: number;
    eDeviceModality: number;
    eDeviceTech: number;
  }

  class Event {
    type: string;
    constructor(type: string);
  }

  class AcquisitionEvent extends Event {
    deviceUid: string;
  }

  class DeviceConnected extends AcquisitionEvent {}
  class DeviceDisconnected extends AcquisitionEvent {}
  class SamplesAcquired extends AcquisitionEvent {
    sampleFormat: SampleFormat;
    samples: string;
  }
  class QualityReported extends AcquisitionEvent {
    quality: QualityCode;
  }
  class ErrorOccurred extends AcquisitionEvent {
    error: number;
  }
  class AcquisitionStarted extends AcquisitionEvent {}
  class AcquisitionStopped extends AcquisitionEvent {}
  class CommunicationFailed extends Event {}

  class WebApi {
    constructor(options?: WebSdk.WebChannelOptionsData);

    enumerateDevices(): Promise<string[]>;
    getDeviceInfo(deviceUid: string): Promise<DeviceInfo>;
    startAcquisition(sampleFormat: SampleFormat, deviceUid?: string): Promise<void>;
    stopAcquisition(deviceUid?: string): Promise<void>;

    onDeviceConnected?: (event: DeviceConnected) => void;
    onDeviceDisconnected?: (event: DeviceDisconnected) => void;
    onSamplesAcquired?: (event: SamplesAcquired) => void;
    onQualityReported?: (event: QualityReported) => void;
    onErrorOccurred?: (event: ErrorOccurred) => void;
    onAcquisitionStarted?: (event: AcquisitionStarted) => void;
    onAcquisitionStopped?: (event: AcquisitionStopped) => void;
    onCommunicationFailed?: (event: CommunicationFailed) => void;

    on(event: string, handler: (e: any) => void): WebApi;
    off(event?: string, handler?: (e: any) => void): WebApi;
  }
}
