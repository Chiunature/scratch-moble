import { StyleSheet } from 'react-native';

const TRACK_HEIGHT = 34;
const TRACK_BORDER_WIDTH = 1;
// 把手与轨道内壁之间的留白，保证把手始终完整落在轨道边框内侧。
const THUMB_GAP = 3;

// 把手需比轨道小一圈：轨道两端各留出 边框宽度 + 留白 的内边距。
export const THUMB_EDGE_INSET = TRACK_BORDER_WIDTH + THUMB_GAP;
export const THUMB_SIZE = TRACK_HEIGHT - THUMB_EDGE_INSET * 2;
export const FILL_CAP_SIZE = TRACK_HEIGHT - TRACK_BORDER_WIDTH * 2;
const TRACK_RADIUS = TRACK_HEIGHT / 2;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: TRACK_HEIGHT,
  },
  sliderFrame: {
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: TRACK_RADIUS,
    borderWidth: TRACK_BORDER_WIDTH,
    height: TRACK_HEIGHT,
    overflow: 'hidden',
    width: '100%',
    boxSizing: 'border-box',
  },
  // 用 top/bottom 双向锚点撑满 track 的内边距区域，而非写死 height，
  // 这样无论 track 的 borderWidth 是多少，fill 都会自动对称收缩到边框内侧，不会跟裁剪边界错位。
  fill: {
    backgroundColor: '#000000',
    borderRadius: TRACK_RADIUS,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  thumb: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 1,
    elevation: 4,
    height: THUMB_SIZE,
    left: 0,
    marginLeft: -THUMB_SIZE / 2,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    top: THUMB_EDGE_INSET,
    width: THUMB_SIZE,
  },
  thumbActive: {
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
});
