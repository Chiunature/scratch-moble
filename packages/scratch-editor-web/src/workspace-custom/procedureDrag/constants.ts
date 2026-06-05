export const ARGUMENT_REPORTER_BLOCK_TYPES = [
  'argument_reporter_boolean',
  'argument_reporter_string_number',
] as const;

export type ArgumentReporterBlockType =
  (typeof ARGUMENT_REPORTER_BLOCK_TYPES)[number];

export const ARGUMENT_REPORTER_TYPE_SET = new Set<string>(
  ARGUMENT_REPORTER_BLOCK_TYPES,
);

export const DEFINITION_HAT_BLOCK_TYPES = new Set([
  'procedures_definition',
  'procedures_prototype',
]);
