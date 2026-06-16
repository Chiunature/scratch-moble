export {
  bleDeviceManager,
  BleDeviceManager,
  startScan,
  stopScan,
  subscribeBluetoothState,
} from './manager';

export type {
  BleDevice,
  DeleteFileOptions,
  DeviceWatchPayload,
  MatrixControlPayload,
  MotorControlPayload,
  UploadFileOptions,
  UploadProgress,
  WatchDeviceItem,
} from './manager';

export { BLE_SIGN } from '../../constants/bleSign';
export { bleLog } from './logger';

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
} from '../../utils/bleDeviceParser';

export {
  isDeviceInScanList,
  loadPairedDevices,
  removePairedDevice,
  savePairedDevice,
} from './pairedDevicesStorage';

export type { PairedBleDevice } from './pairedDevicesStorage';
