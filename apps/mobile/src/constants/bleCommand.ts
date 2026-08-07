// BLE 连接与传输参数（协议帧常量见 @scratch-mobile/protocol）

/** 主机广播名，扫描过滤用 */
export const TARGET_DEVICE_NAME = 'Spark_AI';

/** BLE 上传分包大小，与电脑端 handleDataOfUpload(..., 128) 一致 */
export const BLE_UPLOAD_CHUNK_SIZE = 128;

/** 单包上传超时（电脑端 checkOverTime 5000ms） */
export const BLE_UPLOAD_TIMEOUT_MS = 5000;

/** 获取文件列表前 stop_watch 等待时间 */
export const BLE_FILE_LIST_DELAY_MS = 500;

/** 连接后请求的 ATT MTU，便于上传较大协议帧 */
export const BLE_REQUEST_MTU = 512;