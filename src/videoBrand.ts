import { requireOptionalNativeModule } from 'expo-modules-core';
type RunrunMedia = {
  brandVideo(uri: string): Promise<string>;
  brandPhoto(uri: string): Promise<string>;
  focusCamera(x: number, y: number): Promise<boolean>;
  setExposure(bias: number): Promise<number>;
};
function mediaModule(): RunrunMedia {
  const module = requireOptionalNativeModule<RunrunMedia>('RunrunMedia');
  if (!module) throw new Error('Install the RUNRUN iOS build to use camera processing.');
  return module;
}
export async function brandVideo(uri: string): Promise<string> {
  return mediaModule().brandVideo(uri);
}
export async function brandPhoto(uri: string): Promise<string> { return mediaModule().brandPhoto(uri); }
export async function focusCamera(x: number, y: number): Promise<boolean> { return mediaModule().focusCamera(x, y); }
export async function setCameraExposure(bias: number): Promise<number> { return mediaModule().setExposure(bias); }
