import { registerWebModule, NativeModule } from 'expo';

// RunrunMediaModule is not available on the web platform.
class RunrunMediaModule extends NativeModule<{}> {}

export default registerWebModule(RunrunMediaModule, 'RunrunMediaModule');
