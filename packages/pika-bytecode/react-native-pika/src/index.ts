import { NativeModules } from 'react-native';

export type PikaResult = {
  code: number;
  message: string;
  data?: string;
  dataEncoding?: 'utf8' | 'base64' | 'hex';
};

type PikaNativeModule = {
  compile(source: string, outputPath: string | null): Promise<PikaResult>;
  execute(source: string): Promise<PikaResult>;
  executeBytecode(path: string): Promise<PikaResult>;
  readFile(path: string): Promise<PikaResult>;
  getDefaultBytecodePath(): Promise<string>;
};

const PikaMobile = NativeModules.PikaMobile as PikaNativeModule | undefined;

function requirePikaMobile(): PikaNativeModule {
  if (PikaMobile == null) {
    throw new Error('PikaMobile native module is not linked.');
  }
  return PikaMobile;
}

export async function compile(
  source: string,
  outputPath?: string | null,
): Promise<PikaResult> {
  return requirePikaMobile().compile(source, outputPath ?? null);
}

export async function execute(source: string): Promise<PikaResult> {
  return requirePikaMobile().execute(source);
}

export async function executeBytecode(path: string): Promise<PikaResult> {
  return requirePikaMobile().executeBytecode(path);
}

export async function readFile(path: string): Promise<PikaResult> {
  return requirePikaMobile().readFile(path);
}

export async function getDefaultBytecodePath(): Promise<string> {
  return requirePikaMobile().getDefaultBytecodePath();
}

export type { PikaNativeModule as PikaMobileSpec };
