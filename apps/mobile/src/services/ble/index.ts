export {
  bleDeviceManager,
  BleDeviceManager,
  subscribeBluetoothState,
} from './core/manager';

export { bleConnectionController } from './core/connectionController';

export {
  ConnectionPhaseMachine,
  type BleConnectionPhase,
} from './core/phaseMachine';

export { destroySharedBleManager } from './core/singleton';

export {
  HOST_PROGRAM_SLOTS,
  buildHostBytecodeFileName,
  clampHostProgramSlot,
  HOST_PROGRAM_SLOT_DEFAULT,
  HOST_PROGRAM_SLOT_MAX,
  HOST_PROGRAM_SLOT_MIN,
  mapBleUploadErrorMessage,
  stopHostApp,
  uploadBytecodeToHost,
  type UploadBytecodeToHostOptions,
} from './upload/service';

export type {
  BleDevice,
  DeleteFileOptions,
  DeviceWatchPayload,
  MatrixControlPayload,
  MotorControlPayload,
  UploadFileOptions,
  UploadProgress,
  WatchDeviceItem,
} from './core/manager';

export { BleStoreBootstrap } from './bootstrap/BleStoreBootstrap';

export { bleLog } from './core/logger';
export { BLE_DEVICE_WATCH_DEBUG } from './core/debug';

export {
  openBluetoothSettings,
  requestBlePermissions,
} from './core/permissions';

export {
  BLE_UPLOAD_CHUNK_SIZE,
  TARGET_DEVICE_NAME,
} from '../../constants/bleCommand';

export {
  BLE_SIGN,
  COMMANDS,
  DEVICE_ID_MAP,
  FUNCTION_CODES,
  buildCommand,
  buildInstructFrame,
  buildUploadFrames,
  checkBinData,
  checkFileName,
  buildMatrixCommand,
  buildMotorCommand,
  createEmptyWatchDeviceList,
  distinguishDevice,
  parseDeviceData,
  readHostWillAiState,
} from '@scratch-mobile/protocol';

export {
  getWatchPort,
  getWatchGrayscalePorts,
  getWatchPortsByKind,
  isGrayscaleSensorKind,
  isWatchPortConnected,
  isWatchPortEmpty,
  parseDeviceWatch,
  parseWatchPort,
  GRAYSCALE_SENSOR_KINDS,
  type ColorSensorSnapshot,
  type GraySensorSnapshot,
  type GrayscaleLuxSnapshot,
  type GrayscaleSensorKind,
  type TouchSensorSnapshot,
  type UltrasonicSensorSnapshot,
  type ParsedDeviceWatch,
  type ParsedWatchPort,
} from './device-watch/model';

export {
  useDeviceWatch,
  type DeviceWatchHookState,
} from './device-watch/useDeviceWatch';

export {
  isDeviceInScanList,
  loadPairedDevices,
  normalizeBleDevice,
  normalizeBleDeviceId,
  removePairedDevice,
  savePairedDevice,
} from './storage/pairedDevices';

export type { PairedBleDevice } from './storage/pairedDevices';
