declare module 'react-native-ble-peripheral' {
  interface BlePeripheral {
    addService(uuid: string, primary: boolean): Promise<void>;
    addCharacteristicToService(
      serviceUUID: string,
      characteristicUUID: string,
      properties: number,
      permissions: number
    ): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    sendNotificationToDevice(
      serviceUUID: string,
      characteristicUUID: string,
      data: number[]
    ): Promise<void>;
    setName(name: string): void;
    isAdvertising(): Promise<boolean>;
  }

  const blePeripheral: BlePeripheral;
  export default blePeripheral;
}
