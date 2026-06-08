import { valueToPython, variableFieldToPython } from '../expressions';
import { line } from '../helpers';
import type { StatementGenerator } from '../types';

export const dataStatementGenerators: Record<string, StatementGenerator> = {
  data_setvariableto(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    const value = valueToPython(block, 'VALUE', '0');
    return line(context, `${name} = ${value}`);
  },
  data_changevariableby(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    const delta = valueToPython(block, 'VALUE', '1');
    return line(context, `${name} = ${name} + (${delta})`);
  },
  data_showvariable(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    return line(context, `# show variable ${name}`);
  },
  data_hidevariable(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    return line(context, `# hide variable ${name}`);
  },
  data_addtolist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const item = valueToPython(block, 'ITEM', 'None');
    return line(context, `${lst}.append(${item})`);
  },
  data_deleteoflist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const index = valueToPython(block, 'INDEX', '1');
    return line(context, `del ${lst}[int(${index}) - 1]`);
  },
  data_deletealloflist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    return line(context, `${lst}.clear()`);
  },
  data_insertatlist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const index = valueToPython(block, 'INDEX', '1');
    const item = valueToPython(block, 'ITEM', 'None');
    return line(context, `${lst}.insert(int(${index}) - 1, ${item})`);
  },
  data_replaceitemoflist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const index = valueToPython(block, 'INDEX', '1');
    const item = valueToPython(block, 'ITEM', 'None');
    return line(context, `${lst}[int(${index}) - 1] = ${item}`);
  },
  data_showlist(block, context) {
    const name = variableFieldToPython(block, 'LIST');
    return line(context, `# show list ${name}`);
  },
  data_hidelist(block, context) {
    const name = variableFieldToPython(block, 'LIST');
    return line(context, `# hide list ${name}`);
  },
};
