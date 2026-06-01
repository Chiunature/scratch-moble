/**
 * 固件音高 pitch（0–36）与音名显示工具。
 * 三档八度：0–12 / 12–24 / 24–36，与 NotePickerOverlay 一致。
 */

export const NOTE_PITCH_MAX = 36;

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'E#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'B#',
  'B',
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

/** 单八度键位模板（semitone 为八度内偏移，含顶部 C = 12） */
const OCTAVE_KEY_TEMPLATE = [
  { name: 'C', semitone: 0 },
  { name: 'C#', semitone: 1, isBlack: true },
  { name: 'D', semitone: 2 },
  { name: 'E', semitone: 4 },
  { name: 'E#', semitone: 3, isBlack: true },
  { name: 'F', semitone: 5 },
  { name: 'F#', semitone: 6, isBlack: true },
  { name: 'G', semitone: 7 },
  { name: 'G#', semitone: 8, isBlack: true },
  { name: 'A', semitone: 9 },
  { name: 'B', semitone: 11 },
  { name: 'B#', semitone: 10, isBlack: true },
  { name: 'C', semitone: 12 },
] as const;

/** 黑键相对左侧白键列索引（白键顺序 C D E F G A B C） */
export const BLACK_KEY_WHITE_INDEX: Record<number, number> = {
  1: 0, // C# 在 C 后
  3: 2, // E# 在 E 后
  6: 3, // F# 在 F 后
  8: 4, // G# 在 G 后
  10: 6, // B# 在 B 后
};

export type OctaveKey = {
  pitch: number;
  name: string;
  displayName: string;
  isBlack: boolean;
  octave: number;
};

export const OCTAVE_SWITCHER_LABELS = [
  { title: '第 1 八度', range: 'C – C (0–12)' },
  { title: '第 2 八度', range: 'C1 – C1 (12–24)' },
  { title: '第 3 八度', range: 'C2 – C2 (24–36)' },
] as const;

/** 将任意数值截断到合法 pitch 范围（0–36）并取整。 */
export function clampNotePitch(value: number): number {
  return Math.max(0, Math.min(NOTE_PITCH_MAX, Math.round(value)));
}

/** @deprecated 使用 clampNotePitch */
export function clampMidiNote(value: number): number {
  return clampNotePitch(value);
}

/**
 * pitch → 音名（如 "C1"）。
 * 用于积木槽显示、RN 浮层与 codegen `play_music` 第一参（输出音名字符串，非 pitch 整数）。
 */
export function pitchToDisplayName(pitch: number): string {
  const clamped = clampNotePitch(pitch);
  const octave = Math.min(2, Math.floor(clamped / 12));
  const key = buildOctaveKeys(octave).find(k => k.pitch === clamped);
  return key?.displayName ?? String(clamped);
}

/** @deprecated 使用 pitchToDisplayName */
export function midiNoteToLabel(midi: number): string {
  return pitchToDisplayName(midi);
}

/** 判断 pitch 对应 semitone 是否为黑键。 */
export function isBlackKey(pitch: number): boolean {
  return [1, 3, 6, 8, 10].includes(pitch % 12);
}

/** 生成某一八度（0/1/2）的全部键，pitch 全局 0–36。 */
export function buildOctaveKeys(octave: number): OctaveKey[] {
  const o = Math.max(0, Math.min(2, octave));

  return OCTAVE_KEY_TEMPLATE.flatMap(template => {
    const pitch = o * 12 + template.semitone;
    if (pitch > NOTE_PITCH_MAX) {
      return [];
    }
    const isBlack = 'isBlack' in template && template.isBlack === true;
    const displayName =
      template.name === 'C' && template.semitone === 12
        ? `C${o + 1}`
        : o === 0
          ? template.name
          : `${template.name}${o}`;
    return [
      {
        pitch,
        name: template.name,
        displayName,
        isBlack,
        octave: o,
      },
    ];
  });
}

/** 根据 pitch 推断应展示的八度页（0–2）。 */
export function octaveIndexForPitch(pitch: number): number {
  return Math.min(2, Math.floor(clampNotePitch(pitch) / 12));
}
