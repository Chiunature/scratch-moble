import type { StatementGenerator } from '../types';
import { createControlStatementGenerators } from './control';
import { dataStatementGenerators } from './data';
import { eventStatementGenerators } from './event';
import { matrixLightStatementGenerators } from './matrixLight';
import { motorStatementGenerators } from './motor';
import { moveStatementGenerators } from './move';
import { createNestedStatementsToPython } from './nested';
import { createProcedureStatementGenerators } from './procedures';
import { sensorStatementGenerators } from './sensor/index';
import { soundStatementGenerators } from './sound';
import type { StatementChainFn } from './types';

export function buildStatementGenerators(
  statementChainToPython: StatementChainFn,
): Record<string, StatementGenerator> {
  const nestedStatementsToPython = createNestedStatementsToPython(
    statementChainToPython,
  );

  return {
    ...eventStatementGenerators,
    ...motorStatementGenerators,
    ...moveStatementGenerators,
    ...matrixLightStatementGenerators,
    ...soundStatementGenerators,
    ...createControlStatementGenerators(nestedStatementsToPython),
    ...sensorStatementGenerators,
    ...dataStatementGenerators,
    ...createProcedureStatementGenerators(statementChainToPython),
  };
}
