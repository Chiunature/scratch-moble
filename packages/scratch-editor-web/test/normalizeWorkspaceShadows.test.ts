import {
  DEFAULT_SHADOW_REPORTER_TYPE_SET,
  demoteMatchingBlocksToShadows,
  normalizeDefaultShadowReportersInWorkspaceState,
} from '../src/workspace-custom/normalizeWorkspaceShadows';

describe('normalizeWorkspaceShadows', () => {
  test('demotes default number shadow reporter from block to shadow', () => {
    const state = {
      type: 'run_for_power_seconds',
      inputs: {
        POWER: {
          block: {
            type: 'number_slider_integer',
            fields: { NUM: 50 },
          },
        },
      },
    };

    demoteMatchingBlocksToShadows(state, DEFAULT_SHADOW_REPORTER_TYPE_SET);

    expect(state.inputs.POWER).toEqual({
      shadow: {
        type: 'number_slider_integer',
        fields: { NUM: 50 },
      },
    });
    expect(state.inputs.POWER.block).toBeUndefined();
  });

  test('demotes motor port shadow reporter from block to shadow', () => {
    const state = {
      type: 'run_for_power_seconds',
      inputs: {
        PORTS: {
          block: {
            type: 'motor_port_dropdown',
            fields: { PORT: '4' },
          },
        },
      },
    };

    demoteMatchingBlocksToShadows(state, DEFAULT_SHADOW_REPORTER_TYPE_SET);

    expect(state.inputs.PORTS).toEqual({
      shadow: {
        type: 'motor_port_dropdown',
        fields: { PORT: '4' },
      },
    });
    expect(state.inputs.PORTS.block).toBeUndefined();
  });

  test('does not demote non-default reporter blocks', () => {
    const state = {
      type: 'control_if',
      inputs: {
        CONDITION: {
          block: {
            type: 'operator_equals',
            fields: {},
          },
        },
      },
    };

    demoteMatchingBlocksToShadows(state, DEFAULT_SHADOW_REPORTER_TYPE_SET);

    expect(state.inputs.CONDITION.block?.type).toBe('operator_equals');
    expect(state.inputs.CONDITION.shadow).toBeUndefined();
  });

  test('migrates legacy multi-port reporter to pair dropdown shadow', () => {
    const workspace = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'pair',
            inputs: {
              PORTS: {
                block: {
                  type: 'port_dropdown',
                  fields: { PORT: '0,1' },
                },
              },
            },
          },
        ],
      },
    };

    normalizeDefaultShadowReportersInWorkspaceState(workspace);

    expect(workspace.blocks.blocks[0].inputs.PORTS).toEqual({
      shadow: {
        type: 'port_pair_dropdown',
        fields: { PORT: '0,1' },
      },
    });
  });

  test('normalizes workspace save payload roots', () => {
    const workspace = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'run_for_power_seconds',
            inputs: {
              SECONDS: {
                block: {
                  type: 'math_positive_number_keyboard',
                  fields: { NUM: 2 },
                },
              },
            },
          },
        ],
      },
    };

    normalizeDefaultShadowReportersInWorkspaceState(workspace);

    expect(workspace.blocks.blocks[0].inputs.SECONDS).toEqual({
      shadow: {
        type: 'math_positive_number_keyboard',
        fields: { NUM: 2 },
      },
    });
  });
});
