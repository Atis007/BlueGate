// Reexport the native module. On web, it will be resolved to BleAdvertiserModule.web.ts
// and on native platforms to BleAdvertiserModule.ts
export { default } from './src/BleAdvertiserModule';
export { default as BleAdvertiserView } from './src/BleAdvertiserView';
export * from  './src/BleAdvertiser.types';
