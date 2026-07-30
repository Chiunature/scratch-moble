/** Interleaved conditional-line vertex: [pos, p2, p3, p4] (12 floats). */
export const CONDITIONAL_FLOATS_PER_VERTEX = 12;
export const CONDITIONAL_STRIDE_BYTES = CONDITIONAL_FLOATS_PER_VERTEX * 4;
export const CONDITIONAL_P2_OFFSET_BYTES = 3 * 4;
export const CONDITIONAL_P3_OFFSET_BYTES = 6 * 4;
export const CONDITIONAL_P4_OFFSET_BYTES = 9 * 4;

export function countConditionalVertices(positions: Float32Array): number {
  return positions.length / CONDITIONAL_FLOATS_PER_VERTEX;
}
