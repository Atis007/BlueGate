import { NativeModule, requireNativeModule } from 'expo';

declare class BleAdvertiserModule extends NativeModule {
  startAdvertising(serviceUuid: string, studentId: string): Promise<string>;
  stopAdvertising(): Promise<string>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<BleAdvertiserModule>('BleAdvertiser');
