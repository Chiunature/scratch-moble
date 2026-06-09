# react-native-pika

React Native bindings for the PikaScript mobile runtime in this repository.

## API

```ts
import { compile, execute, executeBytecode, readFile } from 'react-native-pika';

await execute("print('hello from PikaScript')\n");
await compile("print('hello')\n");
await executeBytecode('/path/to/pika-main.py.o');
await readFile('/path/to/file.txt');
```

Every API resolves to:

```ts
type PikaResult = {
  code: number;
  message: string;
  data?: string;
  dataEncoding?: 'utf8' | 'base64' | 'hex';
};
```

## Android

The Android module builds the C runtime with NDK/CMake:

- `android/CMakeLists.txt` compiles `../mobile`, `../pikascript/pikascript-core`, `../pikascript/pikascript-lib/PikaStdLib`, and `../pikascript/pikascript-api`.
- `PikaMobileModule.kt` exposes the same API as a Promise-based Native Module.
- `PikaMobileJni.cpp` bridges Kotlin to `pika_mobile_*`.

Add `PikaMobilePackage()` to your app package list if autolinking is not available.

## iOS

The podspec builds a static framework and includes the same C sources. Add this package to your app, then run:

```sh
bundle exec pod install
```

The ObjC++ module is implemented in `ios/PikaMobile.mm`.
