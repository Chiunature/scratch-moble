export type SchemaRecord = Record<string, unknown>;
export type NumberTuple3 = [number, number, number];
export type SchemaErrorFactory = (message: string) => Error;

const defaultErrorFactory: SchemaErrorFactory = message => new Error(message);

function raise(message: string, makeError: SchemaErrorFactory): never {
  throw makeError(message);
}

export function isSchemaRecord(value: unknown): value is SchemaRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createSchemaReader(
  makeError: SchemaErrorFactory = defaultErrorFactory,
) {
  const fail = (message: string): never => raise(message, makeError);

  return {
    fail,

    record(value: unknown, message: string): SchemaRecord {
      return isSchemaRecord(value) ? value : fail(message);
    },

    array<T = unknown>(value: unknown, message: string): T[] {
      return Array.isArray(value) ? (value as T[]) : fail(message);
    },

    nonEmptyString(
      record: SchemaRecord,
      key: string,
      message: string,
    ): string {
      const value = record[key];
      return typeof value === 'string' && value.length > 0
        ? value
        : fail(message);
    },

    number(record: SchemaRecord, key: string, message: string): number {
      const value = record[key];
      return typeof value === 'number' && !Number.isNaN(value)
        ? value
        : fail(message);
    },

    positiveNumber(record: SchemaRecord, key: string, message: string): number {
      const value = record[key];
      return typeof value === 'number' && !Number.isNaN(value) && value > 0
        ? value
        : fail(message);
    },

    integer(record: SchemaRecord, key: string, message: string): number {
      const value = record[key];
      return typeof value === 'number' && Number.isInteger(value)
        ? value
        : fail(message);
    },

    tuple3(record: SchemaRecord, key: string, message: string): NumberTuple3 {
      const value = record[key];
      return Array.isArray(value) &&
        value.length === 3 &&
        value.every(item => typeof item === 'number' && !Number.isNaN(item))
        ? [value[0], value[1], value[2]]
        : fail(message);
    },

    oneOf<const Values extends readonly unknown[]>(
      value: unknown,
      values: Values,
      message: string,
    ): Values[number] {
      return values.includes(value) ? (value as Values[number]) : fail(message);
    },
  };
}