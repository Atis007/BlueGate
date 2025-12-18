import * as React from 'react';

import { BleAdvertiserViewProps } from './BleAdvertiser.types';

export default function BleAdvertiserView(props: BleAdvertiserViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
