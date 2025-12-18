import { requireNativeView } from 'expo';
import * as React from 'react';

import { BleAdvertiserViewProps } from './BleAdvertiser.types';

const NativeView: React.ComponentType<BleAdvertiserViewProps> =
  requireNativeView('BleAdvertiser');

export default function BleAdvertiserView(props: BleAdvertiserViewProps) {
  return <NativeView {...props} />;
}
