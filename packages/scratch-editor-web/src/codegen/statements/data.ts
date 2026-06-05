import { valueToPython, variableFieldToPython } from '../expressions';
import { indent } from '../helpers';
import type { StatementGenerator } from '../types';

export const dataStatementGenerators: Record<string, StatementGenerator> = {
  data_setvariableto(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    const value = valueToPython(block, 'VALUE', '0');
    return `${indent(context)}${name} = ${value}`;
  },
  data_changevariableby(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    const delta = valueToPython(block, 'VALUE', '1');
    return `${indent(context)}${name} = ${name} + (${delta})`;
  },
  data_showvariable(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    return `${indent(context)}# show variable ${name}`;
  },
  data_hidevariable(block, context) {
    const name = variableFieldToPython(block, 'VARIABLE');
    return `${indent(context)}# hide variable ${name}`;
  },
  data_addtolist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const item = valueToPython(block, 'ITEM', 'None');
    return `${indent(context)}${lst}.append(${item})`;
  },
  data_deleteoflist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const index = valueToPython(block, 'INDEX', '1');
    return `${indent(context)}del ${lst}[int(${index}) - 1]`;
  },
  data_deletealloflist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    return `${indent(context)}${lst}.clear()`;
  },
  data_insertatlist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const index = valueToPython(block, 'INDEX', '1');
    const item = valueToPython(block, 'ITEM', 'None');
    return `${indent(context)}${lst}.insert(int(${index}) - 1, ${item})`;
  },
  data_replaceitemoflist(block, context) {
    const lst = variableFieldToPython(block, 'LIST');
    const index = valueToPython(block, 'INDEX', '1');
    const item = valueToPython(block, 'ITEM', 'None');
    return `${indent(context)}${lst}[int(${index}) - 1] = ${item}`;
  },
  data_showlist(block, context) {
    const name = variableFieldToPython(block, 'LIST');
    return `${indent(context)}# show list ${name}`;
  },
  data_hidelist(block, context) {
    const name = variableFieldToPython(block, 'LIST');
    return `${indent(context)}# hide list ${name}`;
  },
};
