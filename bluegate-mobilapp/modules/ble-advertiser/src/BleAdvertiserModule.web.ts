import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './BleAdvertiser.types';

type BleAdvertiserModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class BleAdvertiserModule extends NativeModule<BleAdvertiserModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(BleAdvertiserModule, 'BleAdvertiserModule');
