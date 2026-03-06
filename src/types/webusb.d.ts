/**
 * WebUSB API type declarations for TypeScript.
 */

interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[];
}

interface USBDevice {
  readonly vendorId: number;
  readonly productId: number;
  readonly productName?: string;
  readonly manufacturerName?: string;
  readonly serialNumber?: string;
  readonly opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

interface USBInTransferResult {
  readonly data?: DataView;
  readonly status: "ok" | "stall" | "babble";
}

interface USBOutTransferResult {
  readonly bytesWritten: number;
  readonly status: "ok" | "stall";
}

interface USB extends EventTarget {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
}

declare global {
  interface Navigator {
    readonly usb?: USB;
  }
}

export {};
