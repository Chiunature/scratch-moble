import * as ScratchBlocks from 'scratch-blocks';

type OutMessage = {
  type: 'editor.code.generated';
  code: string;
  blockCount: number;
};

const BLOCK_TYPES = {
  whenFlagClicked: 'event_whenflagclicked',
  moveSteps: 'motion_movesteps',
  turnRight: 'motion_turnright',
  sayForSecs: 'looks_sayforsecs',
  switchCostumeTo: 'looks_switchcostumeto',
} as const;

function registerEditorBlocks(): void {
  ScratchBlocks.defineBlocksWithJsonArray([
    {
      type: BLOCK_TYPES.whenFlagClicked,
      message0: '当开始运行',
      nextStatement: null,
      style: 'event_blocks',
      extensions: ['shape_hat'],
    },
    {
      type: BLOCK_TYPES.moveSteps,
      message0: '前进 %1 步',
      args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: BLOCK_TYPES.turnRight,
      message0: '右转 %1 度',
      args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: BLOCK_TYPES.sayForSecs,
      message0: '说 %1 持续 %2 秒',
      args0: [
        { type: 'input_value', name: 'MESSAGE' },
        { type: 'input_value', name: 'SECS', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    {
      type: BLOCK_TYPES.switchCostumeTo,
      message0: '切换造型为 %1',
      args0: [{ type: 'input_value', name: 'COSTUME' }],
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
  ]);
}

const toolboxJson = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '事件',
      categorystyle: 'event_category',
      contents: [{ kind: 'block', type: BLOCK_TYPES.whenFlagClicked }],
    },
    {
      kind: 'category',
      name: '运动',
      categorystyle: 'motion_category',
      contents: [
        {
          kind: 'block',
          type: BLOCK_TYPES.moveSteps,
          inputs: {
            STEPS: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 10,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: BLOCK_TYPES.turnRight,
          inputs: {
            DEGREES: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 15,
                },
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: '外观',
      categorystyle: 'looks_category',
      contents: [
        { kind: 'block', type: BLOCK_TYPES.sayForSecs },
        { kind: 'block', type: BLOCK_TYPES.switchCostumeTo },
      ],
    },
  ],
};

const editorTheme = ScratchBlocks.Theme.defineTheme('scratch-mobile', {
  name: 'scratch-mobile',
  blockStyles: {
    event_blocks: {
      colourPrimary: '#FFBF00',
      colourSecondary: '#E6AC00',
      colourTertiary: '#CC9900',
    },
    motion_blocks: {
      colourPrimary: '#4C97FF',
      colourSecondary: '#4280D7',
      colourTertiary: '#3373CC',
    },
    looks_blocks: {
      colourPrimary: '#9966FF',
      colourSecondary: '#855CD6',
      colourTertiary: '#774DCB',
    },
    math_blocks: {
      colourPrimary: '#59C059',
      colourSecondary: '#46B946',
      colourTertiary: '#389438',
    },
    text_blocks: {
      colourPrimary: '#FFBF00',
      colourSecondary: '#E6AC00',
      colourTertiary: '#CC9900',
    },
    logic_blocks: {
      colourPrimary: '#4C97FF',
      colourSecondary: '#4280D7',
      colourTertiary: '#3373CC',
    },
    loop_blocks: {
      colourPrimary: '#0FBD8C',
      colourSecondary: '#0DA57A',
      colourTertiary: '#0B8E69',
    },
    event: {
      colourPrimary: '#FFBF00',
      colourSecondary: '#E6AC00',
      colourTertiary: '#CC9900',
    },
    motion: {
      colourPrimary: '#4C97FF',
      colourSecondary: '#4280D7',
      colourTertiary: '#3373CC',
    },
    looks: {
      colourPrimary: '#9966FF',
      colourSecondary: '#855CD6',
      colourTertiary: '#774DCB',
    },
  },
  categoryStyles: {
    event_category: { colour: '#FFBF00' },
    motion_category: { colour: '#4C97FF' },
    looks_category: { colour: '#9966FF' },
  },
  componentStyles: {
    workspaceBackgroundColour: '#f3f6ff',
    toolboxBackgroundColour: '#ffffff',
    toolboxForegroundColour: '#1f2937',
    flyoutBackgroundColour: '#ffffff',
    flyoutForegroundColour: '#1f2937',
    flyoutOpacity: 1,
    scrollbarColour: '#b8c2d1',
    insertionMarkerColour: '#111827',
    insertionMarkerOpacity: 0.3,
    cursorColour: '#111827',
  },
});

function renderPseudoCode(
  workspace: ReturnType<typeof ScratchBlocks.inject>,
): string {
  const blocks = workspace
    .getTopBlocks(true)
    .sort(
      (a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y,
    );

  if (blocks.length === 0) {
    return '// 拖拽飞出栏积木后生成代码';
  }

  return blocks
    .map(block => {
      const type = block.type;
      if (type === BLOCK_TYPES.whenFlagClicked) return 'when_start()';
      if (type === BLOCK_TYPES.moveSteps) return 'move_steps(10)';
      if (type === BLOCK_TYPES.turnRight) return 'turn_right(15)';
      if (type === BLOCK_TYPES.sayForSecs) return "say_for_secs('Hello', 2)";
      if (type === BLOCK_TYPES.switchCostumeTo)
        return "switch_costume('costume1')";
      return `# ${type}`;
    })
    .join('\n');
}

function postToReactNative(message: OutMessage): void {
  const bridge = (
    window as { ReactNativeWebView?: { postMessage: (raw: string) => void } }
  ).ReactNativeWebView;
  if (bridge?.postMessage) {
    bridge.postMessage(JSON.stringify(message));
  }
}

function bootstrap(): void {
  registerEditorBlocks();
  const host = document.getElementById('workspace');
  const code = document.getElementById('code');
  const send = document.getElementById('send-code');

  if (!host || !code || !send) {
    return;
  }

  const sharedInjectOptions = {
    move: { scrollbars: true, drag: true, wheel: true },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 0.8,
      maxScale: 1.6,
      minScale: 0.45,
      scaleSpeed: 1.08,
      pinch: true,
    },
    media: 'https://unpkg.com/scratch-blocks@2.1.19/media/',
    trashcan: true,
    theme: editorTheme,
    sounds: false,
  };

  const workspace = ScratchBlocks.inject(host, {
    ...sharedInjectOptions,
    toolbox: toolboxJson,
  });

  const publish = (): void => {
    const generated = renderPseudoCode(workspace);
    code.textContent = generated;
    postToReactNative({
      type: 'editor.code.generated',
      code: generated,
      blockCount: workspace.getAllBlocks(false).length,
    });
  };

  workspace.addChangeListener(() => publish());
  send.addEventListener('click', publish);
  publish();
}

bootstrap();
