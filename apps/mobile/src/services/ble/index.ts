export {
  bleDeviceManager,
  BleDeviceManager,
  startScan,
  stopScan,
  subscribeBluetoothState,
} from './core/manager';

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

export { BLE_SIGN } from '../../constants/bleSign';
export { bleLog } from './core/logger';
export { BLE_DEVICE_WATCH_DEBUG } from './core/debug';

export {
  BLE_UPLOAD_CHUNK_SIZE,
  COMMANDS,
  FUNCTION_CODES,
  TARGET_DEVICE_NAME,
} from '../../constants/bleCommand';

export { DEVICE_ID_MAP } from '../../constants/deviceIdMap';

export {
  buildCommand,
  buildInstructFrame,
  buildUploadFrames,
  checkBinData,
  checkFileName,
} from '../../utils/bleProtocol';

export {
  buildMatrixCommand,
  buildMotorCommand,
} from '../../utils/bleRemoteControl';

export {
  createEmptyWatchDeviceList,
  distinguishDevice,
  parseDeviceData,
  readHostWillAiState,
} from '../../utils/bleDeviceParser';

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
