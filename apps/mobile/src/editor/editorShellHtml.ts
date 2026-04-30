export const EDITOR_SHELL_HTML = `
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      :root {
        color-scheme: light;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f3f6ff;
        color: #1f2937;
      }

      * {
        box-sizing: border-box;
        -webkit-user-select: none;
        user-select: none;
      }

      body {
        margin: 0;
        height: 100vh;
        overflow: hidden;
      }

      .shell {
        display: grid;
        grid-template-columns: 180px 1fr 260px;
        gap: 14px;
        height: 100vh;
        padding: 14px;
      }

      .panel {
        border: 1px solid rgba(79, 70, 229, 0.16);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 14px 35px rgba(79, 70, 229, 0.12);
      }

      .palette,
      .output {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
      }

      h1,
      h2 {
        margin: 0;
      }

      h1 {
        font-size: 18px;
      }

      h2 {
        font-size: 15px;
        color: #4f46e5;
      }

      .block {
        min-height: 46px;
        border: 0;
        border-radius: 14px;
        padding: 12px 14px;
        background: linear-gradient(135deg, #ffb020, #ff7a1a);
        color: #fff;
        font-size: 15px;
        font-weight: 800;
        text-align: left;
        box-shadow: 0 8px 18px rgba(255, 122, 26, 0.3);
        touch-action: none;
      }

      .block.motion {
        background: linear-gradient(135deg, #4f8cff, #2563eb);
      }

      .block.looks {
        background: linear-gradient(135deg, #a855f7, #7c3aed);
      }

      .workspace {
        position: relative;
        overflow: hidden;
        border: 2px dashed rgba(79, 70, 229, 0.26);
        background:
          linear-gradient(rgba(99, 102, 241, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99, 102, 241, 0.08) 1px, transparent 1px),
          #ffffff;
        background-size: 28px 28px;
      }

      .workspace-empty {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: #94a3b8;
        font-size: 18px;
        pointer-events: none;
      }

      .workspace-block {
        position: absolute;
        width: 150px;
      }

      pre {
        flex: 1;
        min-height: 0;
        margin: 0;
        overflow: auto;
        border-radius: 14px;
        padding: 12px;
        background: #111827;
        color: #d1fae5;
        font-size: 13px;
        line-height: 1.5;
        user-select: text;
        -webkit-user-select: text;
      }

      .send {
        border: 0;
        border-radius: 14px;
        padding: 12px 14px;
        background: #111827;
        color: #fff;
        font-size: 15px;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="panel palette">
        <h1>积木编辑器</h1>
        <h2>拖到中间区域</h2>
        <button class="block event" data-code="when_start()">当开始运行</button>
        <button class="block motion" data-code="move_forward(10)">前进 10 步</button>
        <button class="block looks" data-code="say('Hello')">说 Hello</button>
      </section>

      <section class="panel workspace" id="workspace">
        <div class="workspace-empty" id="emptyState">把积木拖到这里</div>
      </section>

      <section class="panel output">
        <h2>生成代码</h2>
        <pre id="code">// 拖入积木后自动生成</pre>
        <button class="send" id="sendCode">发送给 App</button>
      </section>
    </main>

    <script>
      (function () {
        var workspace = document.getElementById('workspace');
        var emptyState = document.getElementById('emptyState');
        var codeView = document.getElementById('code');
        var sendButton = document.getElementById('sendCode');
        var blocks = [];
        var activeBlock = null;
        var dragOffset = { x: 0, y: 0 };

        function buildCode() {
          if (blocks.length === 0) {
            return '// 拖入积木后自动生成';
          }

          return blocks
            .slice()
            .sort(function (a, b) {
              return a.y - b.y || a.x - b.x;
            })
            .map(function (block) {
              return block.code;
            })
            .join('\\n');
        }

        function publishCode() {
          var code = buildCode();
          codeView.textContent = code;
          emptyState.style.display = blocks.length === 0 ? 'grid' : 'none';

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: 'editor.code.generated',
                code: code,
                blockCount: blocks.length
              })
            );
          }
        }

        function workspacePoint(event) {
          var rect = workspace.getBoundingClientRect();
          return {
            x: Math.max(12, Math.min(event.clientX - rect.left - dragOffset.x, rect.width - 162)),
            y: Math.max(12, Math.min(event.clientY - rect.top - dragOffset.y, rect.height - 58))
          };
        }

        function moveActiveBlock(event) {
          if (!activeBlock) {
            return;
          }

          var point = workspacePoint(event);
          activeBlock.element.style.left = point.x + 'px';
          activeBlock.element.style.top = point.y + 'px';
          activeBlock.x = point.x;
          activeBlock.y = point.y;
          publishCode();
        }

        function endDrag() {
          activeBlock = null;
        }

        function startWorkspaceDrag(event, block) {
          var rect = block.element.getBoundingClientRect();
          dragOffset = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          };
          activeBlock = block;
          block.element.setPointerCapture(event.pointerId);
        }

        function createWorkspaceBlock(source, event) {
          var clone = source.cloneNode(true);
          clone.classList.add('workspace-block');
          workspace.appendChild(clone);

          var block = {
            element: clone,
            code: source.dataset.code,
            x: 24,
            y: 24
          };

          blocks.push(block);
          startWorkspaceDrag(event, block);
          moveActiveBlock(event);

          clone.addEventListener('pointerdown', function (nextEvent) {
            startWorkspaceDrag(nextEvent, block);
          });
          clone.addEventListener('pointermove', moveActiveBlock);
          clone.addEventListener('pointerup', endDrag);
          clone.addEventListener('pointercancel', endDrag);
        }

        document.querySelectorAll('.palette .block').forEach(function (block) {
          block.addEventListener('pointerdown', function (event) {
            createWorkspaceBlock(block, event);
          });
        });

        sendButton.addEventListener('click', publishCode);
        publishCode();
      })();
    </script>
  </body>
</html>
`;
