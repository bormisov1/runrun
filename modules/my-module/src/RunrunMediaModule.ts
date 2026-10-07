import { NativeModule, requireNativeModule } from 'expo';

declare class RunrunMediaModule extends NativeModule<{}> {
  setValueAsync(value: string): Promise<void>;
}

export default requireNativeModule<RunrunMediaModule>('RunrunMedia');
