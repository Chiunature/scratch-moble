---
title: Scratch Mobile 积木到 Python 生成逻辑（大模型上下文）
document_type: implementation_reference
language: zh-CN
verified_at: 2026-10-08
source_revision: fb8678a
scratch_blocks_version: 2.1.19
target_runtime: PikaScript 与设备固件 API
scope: 积木定义、工作区序列化、Python 生成、移动端编译与上传边界
---

# Scratch Mobile 积木到 Python 生成逻辑

本文根据当前仓库源码整理，适合直接作为大模型上下文、检索知识库材料或新增积木时的实现参考。描述的是当前实现，不是标准 Scratch 语义，也不是期望中的修复结果。源码更新后，应重新核对本文。

## 0. 给大模型的快速约束

1. 项目通过 `scratch-blocks@2.1.19` 提供图形化编辑器，通过自定义 TypeScript 生成器生成 Python 字符串。核心入口是 `renderPythonCode(workspace)`，没有使用 Blockly 官方 Python generator，也没有先转 Scratch VM opcode 再解释执行。
2. Python 面向 PikaScript 和主机固件。`_motor`、`_matrix`、`_beep`、`_os`、`_touch`、`_color`、`_ultrasion`、`_key`、`_math`、`_random` 和 `PikaStdData` 是输出中依赖的运行环境名称；生成器没有为它们生成 import 或实例化代码。
3. 顶层普通积木只有接在 `event_when_flag_clicked` 的 `next` 链上才进入主程序；顶层 `procedures_definition` 会单独输出。孤立普通积木和顶层 reporter 不会自动执行。
4. 判断积木使用精确 `type`，读取参数使用精确 field/input 名称。中文标签和下拉显示文字不作为分派依据。`BLOCK_TYPES.motor.runPower` 的真实 type 是 `run_power`，不是 `motor_run_power`。
5. 严格区分父积木的 `fields`、表达式槽 `inputs`、语句体 `SUBSTACK` 和同层后继 `next`。例如端口槽叫 `PORTS`，槽内 shadow 的字段叫 `PORT`。
6. 区分工具箱默认值与生成器 fallback：前者是新拖入积木已有的 shadow/字段值，后者只在读取不到输入或字段时生效。电机界面默认 E=4，生成器缺失端口时却使用 1。
7. 复现当前输出时保留 `_beep.play_muic`、`_ultrasion`、`read_adcance_left_offset`、`resetTimer` 的原始拼写和大小写。是否为固件约定需另外确认，不能凭英语习惯修正。
8. `control_while_do` 是“重复执行直到条件成立”，输出 `while not (条件)`；`control_wait` 是“等待条件成立”，不是普通等待秒数。
9. 列表初始化为 `PikaStdData.List()`，并使用固件列表方法。列表 INDEX 原样传递，生成器没有统一减一；字符串取第 N 个字符则显式减一。
10. 工作区变量和函数参数中的中文逐字转无声调拼音。变量名没有完整去重或 Python 关键字保护；不能假定任意显示名都能安全编译。
11. 生成结果、Pika 编译成功、固件执行成功是三种不同结论。本文验证了源码与部分生成输出，没有验证所有硬件 API 的固件实现。
12. 涉及修复时先说明“当前实际输出”和“建议改变的行为”，不要把建议混入当前映射。已知边界见第 11 节。

## 1. 范围、术语与源码入口

### 1.1 术语

- **积木定义（block definition）**：积木 type、字段、输入槽、连接形状和显示样式。
- **工具箱（toolbox）**：分类列表、可拖出的积木及其初始参数。
- **报告块（reporter）**：返回数字、字符串、布尔值等表达式，通常嵌在其他积木输入槽中。
- **阴影块（shadow）**：输入槽中的默认值块，例如数字或端口选择；不是父积木本身的 field。
- **语句块（statement）**：输出一行或多行代码，通过 `next` 组成同层顺序，通过 `SUBSTACK` 等输入组成嵌套语句。
- **工作区快照**：Blockly serialization 保存的 JSON；包含积木连接关系、字段、变量等。
- **工作区对象**：加载快照后得到的实时 ScratchBlocks workspace，提供 `getTopBlocks` 等方法；它才是生成器直接接收的对象。
- **自制积木（procedure）**：用户定义的有名字和参数的指令，映射成 Python 函数定义与调用。
- **BLE**：Bluetooth Low Energy，低功耗蓝牙，用于向设备上传编译后的字节码。

### 1.2 主要目录

以下路径均相对于仓库根目录。

- `packages/scratch-editor-web/src/main.ts`：初始化编辑器、注入 workspace、创建桥控制器。
- `packages/scratch-editor-web/src/locale/applyEditorLocale.ts`：初始化语言并调用 `registerEditorBlocks()`；切语言时重新注册并重建积木实例。
- `packages/scratch-editor-web/src/blocks/blockTypes.ts`：59 个项目自定义 type 常量，包括 11 个公共 shadow/reporter。
- `packages/scratch-editor-web/src/blocks/registerBlocks.ts`：`getEditorBlockDefinitions()` 聚合定义；`registerEditorBlocks()` 删除同名定义后调用 `defineBlocksWithJsonArray()`。
- `packages/scratch-editor-web/src/blocks/blockDefinitions/`：分门别类的积木定义，含 `commonReporters.ts`、`motor.ts`、`move.ts`、`matrixLight.ts`、`sound.ts`、`event.ts`、`control.ts`、`sensor.ts`。
- `packages/scratch-editor-web/src/blocks/toolbox.ts`、`blocks/toolboxCategories/`：工具箱分类与初始值；`shadowPresets.ts` 构造槽内 shadow。
- `packages/scratch-editor-web/src/codegen/generators.ts`：整份程序的布局、顶层筛选、语句链遍历。
- `packages/scratch-editor-web/src/codegen/expressions.ts`：表达式分派、输入取值、端口展开、音符转换。
- `packages/scratch-editor-web/src/codegen/statements/`：各类别语句生成器；`index.ts` 合并分派表。
- `packages/scratch-editor-web/src/codegen/moduleCall.ts`：固件模块前缀与调用字符串拼接。
- `packages/scratch-editor-web/src/codegen/helpers.ts`：字段读取、变量显示名读取、四空格缩进、字符串引用。
- `packages/scratch-editor-web/src/codegen/workspaceVariables.ts`：工作区变量收集、初始化和 global 声明。
- `packages/scratch-editor-web/src/codegen/pythonIdentifier.ts`、`procedureNames.ts`、`codegenScope.ts`：标识符转换、函数/参数注册表、同步生成上下文。
- `packages/scratch-editor-web/src/bridge/`：工作区持久化、代码发布、撤销历史及原生消息路由。
- `packages/shared/src/`：跨端消息协议、项目类型、端口/音符/点阵工具。
- `apps/mobile/src/features/editor/bridge/useEditorSessionManager.ts`：接收生成代码并保存到 React 状态。
- `apps/mobile/src/features/editor/hooks/useEditorPikaWorkflow.ts`：运行/下载按钮的编译与上传流程。
- `apps/mobile/src/services/pika/pikaService.ts`：调用 `react-native-pika` 原生编译接口。
- `packages/core/src/runtime/pika.ts`：可编译源码过滤、编译诊断映射、字节码 magic 校验。
- `apps/mobile/src/services/ble/upload/service.ts`：读取字节码并上传设备。

### 1.3 分类与数量

工具箱顺序为 motor、move、matrixLight、sound、event、control、sensor、operation、variable、customBlock。

- 普通自定义积木共 48 个：电机 4、运动 9、矩阵灯 5、声音 1、事件 1、控制 9、传感器 19。
- 公共自定义 shadow/reporter 共 11 个；两者合计 59 个项目自定义 type。
- 运算分类使用 18 个 Scratch 内置 `operator_*` type，由本项目自行生成 Python。
- 变量和自制积木使用动态分类，分别由 `ScratchVariables.getVariablesCategory`、`ScratchProcedures.getProceduresCategory` 构建。
- `dynamicToolbox.ts` 隐藏变量/列表的显示与隐藏积木；生成器仍保留它们的注释输出以处理已有工作区。
- `control_wait`、`control_if` 等与库内置名称重合，但注册时会被项目定义覆盖，语义应以本项目为准。

## 2. 从编辑到设备运行的数据流

### 2.1 编辑与生成

1. `bootstrap()` 应用语言、注册积木和自定义字段，再执行 `ScratchBlocks.inject()`。
2. `createWorkspaceController()` 建立一个工作区变更监听，并把变更分发给三个独立模块：代码生成默认防抖 200ms、工作区保存默认防抖 1500ms、历史状态发布调度 0ms。
3. `createCodeGenerationPublisher().flush()` 调用 `renderPythonCode(workspace)`，并读取 `workspace.getAllBlocks(false).length` 作为 `blockCount`。该数量不等于生成语句数，也不代表所有积木都可执行。
4. 若 code 和 blockCount 均与上次相同，跳过发送；否则发送 `editor.code.generated`。
5. 原生端 `useEditorSessionManager` 再次按 code/blockCount 去重，更新 `generatedCode` 和 `blockCount`，供代码面板与运行流程使用。

代码消息形状如下，这是通信示例而不是项目存盘文件：

```json
{
  "type": "editor.code.generated",
  "code": "_motor.run_power(4, 50)",
  "blockCount": 4
}
```

协议唯一来源为 `packages/shared/src/types/editorBridge.ts`。WebView 向原生端发送 JSON；原生端通过注入 JavaScript 调用 `__scratchEditorReceiveFromNative(message)` 回传消息。

### 2.2 加载与保存

- WebView 就绪发送 `editor.workspace.ready`，初次加载完成前禁用画布交互。
- 原生发送 `editor.workspace.load`，携带 `projectId`、`workspace` 和 `revision`。
- Web 端禁用事件，清空工作区，复制并规范化快照，再执行 `ScratchBlocks.serialization.workspaces.load()`。
- 加载后调用 `insertStartHatBlockIfMissing()`；若缺少启动帽，则在 `(48,48)` 插入。`main.ts` 另通过 `maxInstances` 将启动帽 UI 数量上限设为 1。这里不是生成器内部自动加帽。
- 随后刷新颜色、清空撤销历史、立即生成代码，并发送 `editor.workspace.loaded`。
- 保存调用 `serialization.workspaces.save()` 并规范化，发送 `editor.workspace.changed`，包含 workspace、projectId、revision、blockCount 和可选缩略图。
- 普通自动保存按内容去重；缩略图有 600ms 超时兜底。代码发布与工作区保存是不同消息，不应混用 revision 或认为两者同步完成。

### 2.3 编译与上传

1. `useEditorPikaWorkflow(generatedCode)` 的运行/下载操作先检查蓝牙连接。
2. `compileGeneratedCode()` 对源码 trim，并用 `isCompilablePythonSource()` 过滤空串、`//` 占位文案及两个固定中文提示前缀。这个检查不是 Python 语法分析器。
3. 调用 `react-native-pika` 的 `compile(source, targetPath)`。当前移动端声明依赖版本为 `0.1.1`；仓库没有旧文档中描述的 `packages/pika-bytecode/` 本地源码目录。
4. 编译产物为手机本地 PikaScript `.py.o` 字节码；`readBytecodeFile()` 读取并解码 hex/base64 等数据，校验文件头 `0f 70 79 6f`。
5. `uploadBytecodeToHost()` 将文件经 BLE 发往主机程序槽位 0–10，主机文件名为 `{slot}.o`，例如 `0.o`。
6. “运行”传 `runAfterUpload=true`；“下载”传 false。暂停走 `stopHostApp()`，不是重新生成 Python。

生成器、桥接状态、原生编译、蓝牙传输分别承担不同职责。`renderPythonCode()` 本身不会执行代码、操作硬件或保存项目。

## 3. 工作区与积木数据契约

### 3.1 三层结构

- 项目文档：`ScratchProjectDocument`，包含 `schemaVersion: 1`、id、name、createdAt、updatedAt、editor 元数据和 `workspace`。
- 工作区快照：Blockly 序列化 JSON；`WorkspaceSnapshot` 在共享类型中是 `unknown`，不是本项目自定义的完整 AST schema。
- 实时积木对象：生成器通过 `block.type`、`getFieldValue()`、`getInputTargetBlock()`、`getNextBlock()`、`inputList`、`getProcCode()` 等方法读取。

因此，JSON 不能直接传给 `renderPythonCode()`。正常链路应先通过 ScratchBlocks 反序列化得到工作区对象。

### 3.2 字段、输入和连接

- `fields.MODE`、`fields.DIRECTION`、`fields.CMP` 等是父块自己的字段。
- `inputs.POWER.shadow` 是默认功率；用户拖入运算块后，实际表达式可成为 `inputs.POWER.block`，shadow 仍可能作为默认备份存在。
- 生成器读取 `getInputTargetBlock('POWER')` 获得当前有效子块，不直接在 JSON 中任选 shadow。
- `inputs.SUBSTACK.block` 是循环或分支的第一条语句。
- `next.block` 是同一层的下一条语句，不是嵌套语句体。
- `x/y` 是顶层布局信息；顶层脚本会按 y 排序，但栈内部严格沿 next 遍历。
- VARIABLE/LIST field 的 `getFieldValue()` 通常返回变量 ID。生成器优先读取 field 的显示文本，再查工作区变量模型，最后才回退到原始值。JSON 中要保持变量注册表与字段引用的一致性。

### 3.3 最小结构示例

以下是用于说明连接关系的最小 workspace JSON 示例，不含项目外层元数据，也不是完整 Scratch `.sb3` 项目。实际导入应交由当前版本的 ScratchBlocks serializer 校验。

```json
{
  "blocks": {
    "languageVersion": 0,
    "blocks": [
      {
        "type": "event_when_flag_clicked",
        "x": 48,
        "y": 48,
        "next": {
          "block": {
            "type": "run_power",
            "inputs": {
              "PORTS": {
                "shadow": {
                  "type": "motor_port_dropdown",
                  "fields": { "PORT": "4" }
                }
              },
              "POWER": {
                "shadow": {
                  "type": "number_slider_integer",
                  "fields": { "NUM": 50 }
                }
              }
            }
          }
        }
      }
    ]
  }
}
```

其对应的有效积木对象进入生成器后，代码为 `_motor.run_power(4, 50)`。

### 3.4 快照规范化

`normalizeDefaultShadowReportersInWorkspaceState()` 在保存和加载时参与处理：

- 将默认 shadow 类型的槽内 `block` 降回 `shadow`，保留 type 和 fields。
- 将历史 `port_dropdown` 中含逗号的 PORT 值迁移到 `port_pair_dropdown`；这不是所有旧电机端口的全面迁移。
- 去掉 `procedures_prototype` 中由 mutation 派生的参数 reporter 输入，避免反序列化后重复生成。
- 去掉顶层孤立 `argument_reporter_boolean` / `argument_reporter_string_number`。
- 默认 shadow 类型集合包括下面的 11 个自定义类型，以及内置 `math_integer`、`text`。

### 3.5 公共 shadow / reporter

- `port_dropdown`：字段 `PORT`，传感器 A/B/C/D 对应字符串 `0/1/2/3`；默认 `0`。
- `motor_port_dropdown`：字段 `PORT`，电机 E/F/G/H 对应字符串 `4/5/6/7`；默认 `4`。
- `port_pair_dropdown`：字段 `PORT`，例如 `"0,1"`，不是 JSON 数组。
- `motor_port_pair_dropdown`：字段 `PORT`，例如 `"4,5"`。
- `number_slider_integer`：字段 `NUM`；定义默认 0，范围 -100～100，步长 1。
- `number_slider_decimal`：字段 `NUM`；定义默认 0，范围 -100～100，步长 0.1。
- `math_positive_number_keyboard`：字段 `NUM`，接受任意实数，历史名称中的 positive 不意味着非负约束。
- `basic_dropdown_num_col`：字段 `NUM`，矩阵列坐标 0～4。
- `basic_dropdown_num_row`：字段 `NUM`，矩阵行坐标 0～6。
- `note_picker`：字段 `NOTE`，保存 pitch 0～36，默认 12；输出音名字符串，例如 12 → `"C1"`。
- `handle_shank_picker`：字段 `HANDLESHANK`，保存 `up/down/left/right/L1/R1/y/a/b/x`，默认 up；输出带引号的键名。

双端口 UI 会过滤到对应硬件端口集合、排序并保留两个端口；不足两个时回退到传感器 `0,1` 或电机 `4,5`。底层 `parsePortFieldValue()` 只拆分和 trim 字符串，空值回退 0，不承担数值范围检查。

一般表达式路径把双端口输出为 `[4, 5]`；只有显式使用 `multiPortsInputToPythonArgs()` 的 `pair` 和 `two_calibrate` 将其展开成独立位置参数 `4, 5`。若这些槽连接其他表达式，则整段表达式只作为一个参数传入。

## 4. 整份 Python 的生成算法

依据：`codegen/generators.ts`、`statements/index.ts`、`statements/nested.ts`、`helpers.ts`。

### 4.1 顶层选择与布局

1. 读取 `workspace.getTopBlocks(true)`，再按 `getRelativeToSurfaceXY().y` 升序排序。
2. 若顶层块数为 0，立即返回 `# 拖拽飞出栏积木后生成 Python 代码`，尚未收集变量。
3. 收集工作区标量/列表变量，忽略 `broadcast_msg` 变量，转换 Python 名称并按名称排序。
4. 收集顶层 `procedures_definition`，建立函数名和参数名注册表。
5. 收集顶层 `event_when_flag_clicked`，从每个帽子的下一块开始生成主程序。帽子本身不输出到正常主程序中。
6. 顶层其余积木不直接生成。若异常工作区存在多个启动帽，其脚本被顺序拼接，不创建并发任务。
7. 没有变量、没有函数定义时，只连接主脚本。
8. 存在变量或函数定义时，按“变量初始化 → 函数定义 → 主脚本”组织，节之间插入空行。没有 `main()` 包装，也没有 `if __name__ == '__main__'`。
9. 有变量且主脚本非空时，主脚本前另插入顶层 `global ...`；每个函数体也声明所有工作区变量为 global。

边界输出：

- 没有主脚本也没有函数定义，但存在变量：只返回变量初始化。
- 没有可生成脚本、没有变量，且有非启动帽顶层块：返回 `# 请从「当程序启动时」积木开始搭建程序`。
- 仅有空启动帽：返回拖拽提示。
- 有函数定义但没有主脚本：输出函数定义，不会自动调用。

### 4.2 语句链与表达式递归

- `statementChainToPython()` 沿 `getNextBlock()` 遍历，以换行连接各块输出。
- `blockToPython()` 用 `statementGenerators[block.type]` 查找语句生成函数。
- 遇到 `procedures_definition` 后，外层链遍历停止，因为定义生成器已经把其 next 链作为函数体处理。
- `valueToPython()` 通过 input 名找到目标 reporter，再调用 `expressionBlockToPython()` 递归生成；输入不存在时使用该位置的 fallback。
- `fieldToPython()` 原样读取字段字符串；`fieldStringToPython()` 给字符串枚举加引号。
- `quotePythonString()` 当前使用 `JSON.stringify()` 生成引号和转义，常规文本输出为双引号字符串。
- 每层缩进为 4 个空格。`childContext()` 继承变量和函数注册表，仅增加 indent。
- `runWithGenerateContext()` 用同步作用域保存当前函数上下文，供 argument reporter 解析形参，finally 恢复上一个上下文。
- 未识别语句输出 `# TODO: unsupported block <type>`；未识别表达式输出 `None  # TODO: unsupported expression <type>`，不是抛异常。

### 4.3 固件模块实际映射

- motor 与 move 都调用 `_motor`。
- matrixLight 调用 `_matrix`；sound 调用 `_beep`；control 调用 `_os`。
- touch_sensor 调用 `_touch`；gray_sensor 调用 `_color`；ultrasonic_sensor 调用 `_ultrasion`。
- 手柄按键与四个偏移读取 reporter 调用 `_key`，偏移设置语句调用 `_motor`。
- `moduleCall.ts` 虽定义 `_remote_control_sensor` 前缀，当前对应积木生成器没有使用它。
- timer / resetTimer 位于传感器工具箱，但调用 `_os`。
- 运算 reporter 还直接使用 `_math` 和 `_random`。
- `moduleCall()` 只负责缩进和字符串拼接；string[] 参数会展开，不做类型检查、导入管理或 API 存在性验证。

## 5. 自定义积木完整映射

### 5.1 读法

以下每条包含真实 type、参数来源、当前 Python 模板和 fallback。模板中的大写标识符代表“该 field/input 生成的 Python 文本”，不是最终程序里的变量名。

- `I` 表示 `input_value`，递归生成表达式。
- `F` 表示父块字段。
- `S` 表示 `input_statement` 子语句链。
- fallback 按参数列表的同一顺序列出。它不是工具箱初值，常见差异集中在第 9 节。
- 所有固件调用名称均按当前生成器记录；具体物理单位、固件阻塞行为和有效范围只能在源码明确约束的范围内确定。

### 5.2 电机（4）

依据：`codegen/statements/motor.ts`。

- `run_for_power_seconds`：I `PORTS, POWER, SECONDS` → `_motor.run_for_power_seconds(PORTS, POWER, SECONDS)`；fallback `1, 50, 2`。
- `run_power`：I `PORTS, POWER` → `_motor.run_power(PORTS, POWER)`；fallback `1, 50`。
- `stop`：I `PORTS` → `_motor.stop(PORTS)`；fallback `1`。
- `stop_module`：I `PORTS`，F `MODE` → `_motor.stop_module(PORTS, MODE)`；fallback `1, 0`。MODE：0 滑行、1 刹车，输出数字而不是字符串。

### 5.3 运动 / 双电机（9）

依据：`codegen/statements/move.ts`。

- `pair`：I `PORTS`，F `DIRECTION` → `_motor.pair(PORT_LEFT, PORT_RIGHT, DIRECTION)`；双端口展开，fallback 端口 `0,1`，方向 `0`。DIRECTION：0 左反转、1 右反转、2 全反转、3 全正转。
- `mov_set_stop_module`：F `MODE` → `_motor.mov_set_stop_module(MODE)`；fallback `1`。
- `mov_dir_power_seconds`：F `DIRECTION`，I `POWER, SECONDS` → `_motor.mov_dir_power_seconds("方向", POWER, SECONDS)`；fallback `"advance", 50, 1`。
- `mov_dir_power`：F `DIRECTION`，I `POWER` → `_motor.mov_dir_power("方向", POWER)`；fallback `"advance", 50`。
- `mov_stop`：无参数 → `_motor.mov_stop()`。
- `mov_for_power_seconds`：I `LEFT_POWER, RIGHT_POWER, SECONDS` → `_motor.mov_for_power_seconds(LEFT_POWER, RIGHT_POWER, SECONDS)`；fallback `50, 50, 1`。
- `mov_power`：I `LEFT_POWER, RIGHT_POWER` → `_motor.mov_power(LEFT_POWER, RIGHT_POWER)`；fallback `50, 50`。
- `mov_find_line_init`：无参数 → `_motor.mov_find_line_init()`。
- `mov_find_line_run`：I `LEFT_SENSOR, RIGHT_SENSOR, LEFT_POWER, RIGHT_POWER, KP, KD` → `_motor.mov_find_line_run(LEFT_SENSOR, RIGHT_SENSOR, LEFT_POWER, RIGHT_POWER, KP, KD)`；fallback `0, 1, 50, 50, 0.1, 0.6`。

方向运动字段取 `advance/retreat/left/right`，输出带引号的英文枚举；`pair.DIRECTION` 则是数字枚举，两者不可混用。

### 5.4 矩阵灯（5）

依据：`codegen/statements/matrixLight.ts`、`packages/shared/src/utils/matrixLightRows.ts`。

- `show`：F `MATRIX` → `_matrix.show(ROW1, ROW2, ROW3, ROW4, ROW5, ROW6, ROW7)`；fallback `1F,1F,1F,1F,1F,1F,1F`。每行输出为 `0xNN` 独立参数，不是字符串或列表。
- `clear`：无参数 → `_matrix.clear()`。
- `set_brightness`：F `BRIGHTNESS` → `_matrix.set_brightness(BRIGHTNESS)`；fallback 0；字段选项 0～7。
- `show_roll`：I `TEXT` → `_matrix.show_roll(str(TEXT))`；fallback 文本 `"ABCD"`。
- `set_pixel_brightness`：I `X, Y`，F `OPEN` → `_matrix.set_pixel_brightness(X, Y, OPEN)`；fallback `0, 0, 0`。

点阵存储规则：

- 7 行、5 列，MATRIX 是逗号分隔的 7 个十六进制字节文本。
- 每行只保留低 5 位，bit0 是最左列，bit4 是最右列；`01` 仅最左亮、`10` 仅最右亮、`1F` 全亮。
- 解析时去掉可选 `0x`，空/无法解析的行归 00，按 `& 0x1f` 掩码；不足七行补零，超过七行截断。
- 像素开关定义是 OPEN=`1` 打开、`0` 关闭。工具箱注释与定义相反，但实际工具箱初值确实为 `0`；解释时以定义和数值为准。

### 5.5 声音（1）

依据：`codegen/statements/sound.ts`、`expressions.ts` 的 `noteValueToPython()`、`packages/shared/src/utils/notePitch.ts`。

- `play_music`：I `NOTE, DURATION` → `_beep.play_muic(NOTE_NAME, DURATION)`；fallback 音高 12 → `"C1"`，时长 1。
- NOTE 若为 `note_picker`，输出音名字符串；若为数字字面量，四舍五入并限制到 0～36，再转换音名；若为 text，直接输出文本字符串。
- NOTE 若连接变量、算术等其他类型，并不会把其表达式原样输出，而是回退到默认音高 `"C1"`。
- 音名来自项目自身的 `notePitch.ts`，包含 E#、B# 等标签；复现时使用项目函数，不套用外部 MIDI 或标准音阶换算表。

### 5.6 事件（1）

依据：`codegen/generators.ts`、`codegen/statements/event.ts`。

- `event_when_flag_clicked`：正常生成路径中只用作主程序入口，其 next 链构成脚本。
- 事件语句分派表另有输出 `# 当开始运行` 的实现，但正常 `startHatScriptToPython()` 会跳过帽子本身，因此常规输出没有该注释。
- 不生成 Python 事件监听器，也不支持由这个帽子自动派生并发执行。

### 5.7 控制（9）

依据：`codegen/statements/control.ts`、`statements/nested.ts`。

- `sleep_s`：I `SECONDS` → `_os.sleep_s(SECONDS)`；fallback 1。
- `control_wait`：I `CONDITION`，fallback False → `while not (CONDITION):`，循环体仅 `_os.sleep_s(0.001)`。
- `control_break`：输出 `break`；没有生成期“必须位于循环内”的校验。
- `control_while_times`：I `TIMES`，S `SUBSTACK` → `for count in range(TIMES):`；次数 fallback 10；先输出语句体，再在循环体末尾追加 `_os.sleep_s(0.001)`。
- `control_while`：S `SUBSTACK` → `while True:`；语句体后追加同样的 1ms sleep。
- `control_if`：I `CONDITION`，S `SUBSTACK` → `if CONDITION:`；条件 fallback False。
- `control_if_else`：I `CONDITION`，S `SUBSTACK, SUBSTACK2` → `if CONDITION:` / `else:`；条件 fallback False。
- `control_while_do`：I `CONDITION`，S `SUBSTACK` → `while not (CONDITION):`；条件 fallback False；语句体后追加 1ms sleep。
- `control_stop_exit`：输出 `_os.stop_exit()`；生成器仍会沿 next 遍历，实际停止效果交给固件。

计数循环固定使用名字 `count`，没有按嵌套层级改名。sleep 是程序文本中的尾部语句，遇到 break 等提前跳转时不保证每次迭代都执行。

空语句体目前返回一行缩进空白，不自动补 pass。循环因尾部有 sleep 仍有实体语句；空 if/else 分支可能生成无效 Python。空函数体与此不同，会显式补 pass。

### 5.8 传感器（19）

依据：`codegen/expressions.ts` 的两个 sensor reporter 分派函数，以及 `codegen/statements/sensor/`。

触碰（1）：

- `state`：布尔 reporter，I `PORTS` → `_touch.state(PORTS)`；fallback 1。

灰度（6）：

- `cmp_lux`：布尔 reporter，I `PORTS, VALUE`，F `CMP` → `_color.cmp_lux(PORTS, "CMP", VALUE)`；fallback `1, ">", 50`，此处按调用参数顺序列出。
- `lux`：数字 reporter，I `PORTS` → `_color.lux(PORTS)`；fallback 1。
- `set_color_threshold_value`：语句，I `PORTS, VALUE` → `_color.set_color_threshold_value(PORTS, VALUE)`；fallback `1, 1000`。
- `lux_state`：布尔 reporter，I `PORTS` → `_color.lux_state(PORTS)`；fallback 1。
- `one_calibrate`：语句，I `PORTS, SECONDS` → `_color.one_calibrate(PORTS, SECONDS)`；fallback `1, 1`。
- `two_calibrate`：语句，I `PORTS, SECONDS` → `_color.two_calibrate(PORT_LEFT, PORT_RIGHT, SECONDS)`；双端口展开，fallback `0, 1, 1`。

超声波（2）：

- `cmp_value`：布尔 reporter，I `PORTS, VALUE`，F `CMP` → `_ultrasion.cmp_value(PORTS, "CMP", VALUE)`；fallback `1, ">", 100`。
- `value`：数字 reporter，I `PORTS` → `_ultrasion.value(PORTS)`；fallback 1。

CMP 的字段枚举为 `> / < / =`。这里把 `"="` 当固件方法参数传入，不转换为 Python 运算符 `==`。

手柄及偏移（7）：

- `key_remote`：布尔 reporter，I `HANDLESHANK`，F `STATE` → `_key.key_remote(KEY_NAME, "STATE")`；fallback `"up", "press"`；STATE 为 `press/unpress`。
- `mov_set_advance_offset`：语句，I `LEFT_OFFSET, RIGHT_OFFSET` → `_motor.mov_set_advance_offset(LEFT_OFFSET, RIGHT_OFFSET)`；fallback `0, 0`。
- `mov_set_retreat_offset`：语句，I `LEFT_OFFSET, RIGHT_OFFSET` → `_motor.mov_set_retreat_offset(LEFT_OFFSET, RIGHT_OFFSET)`；fallback `0, 0`。
- `read_adcance_left_offset`：数字 reporter，无参数 → `_key.read_adcance_left_offset()`。
- `read_advance_right_offset`：数字 reporter，无参数 → `_key.read_advance_right_offset()`。
- `read_retreat_left_offset`：数字 reporter，无参数 → `_key.read_retreat_left_offset()`。
- `read_retreat_right_offset`：数字 reporter，无参数 → `_key.read_retreat_right_offset()`。

其他（3）：

- `key_mast`：布尔 reporter，F `KEY, STATE` → `_key.key_mast("KEY", STATE)`；KEY 为 `left/right`，STATE 为数字 `1/0`；fallback `"left", 1`。
- `timer`：数字 reporter，无参数 → `_os.timer()`。
- `resetTimer`：语句，无参数 → `_os.resetTimer()`。

这些 reporter 只有嵌入语句输入等有效表达式位置时才成为程序的一部分。拖成顶层独立块不会自动变成打印或赋值。

## 6. 内置运算积木映射

依据：`codegen/expressions.ts`、`blocks/toolboxCategories/operation.ts`。以下为 input fallback，工具箱可能另设默认 shadow。

### 6.1 数值与算术

- 数字字面量：`math_number`、`math_positive_number`、`math_whole_number`、`math_integer`，以及第 3.5 节的五个自定义数字类，均直接读取 `NUM` 字符串，缺失时输出 0。
- `text`：读取 `TEXT`，缺失为空字符串，输出带引号的文本。
- `operator_add`：I `NUM1, NUM2` → `(NUM1 + NUM2)`；fallback `0, 0`。
- `operator_subtract`：同样的输入 → `(NUM1 - NUM2)`；fallback `0, 0`。
- `operator_multiply`：同样的输入 → `(NUM1 * NUM2)`；fallback `0, 0`。
- `operator_divide`：同样的输入 → `(NUM1 / NUM2)`；fallback `0, 1`。
- `operator_mod`：同样的输入 → `(NUM1 % NUM2)`；fallback `0, 1`。
- `operator_random`：I `FROM, TO` → `_random.randint(FROM, TO)`；fallback `1, 10`，没有为小数范围切换到其他随机算法。
- `operator_round`：I `NUM` → `_math.round(NUM)`；fallback 0，不是 Python 内置 `round()`。

### 6.2 比较与布尔

- `operator_equals`：I `OPERAND1, OPERAND2` → `(OPERAND1 == OPERAND2)`；fallback `0, 0`。
- `operator_lt` / `operator_gt`：同样输入 → `<` / `>`；fallback `0, 0`。
- `operator_and` / `operator_or`：同样输入 → `(OPERAND1 and OPERAND2)` / `(OPERAND1 or OPERAND2)`；fallback `False, False`。
- `operator_not`：I `OPERAND` → `not (OPERAND)`；fallback False。

比较表达式直接使用 Python 操作符，没有实现完整 Scratch 的隐式数字/字符串转换规则。

### 6.3 字符串

- `operator_join`：I `STRING1, STRING2` → `str(STRING1) + str(STRING2)`；fallback 均为 `''`。
- `operator_letter_of`：I `LETTER, STRING` → `(str(STRING)[int(LETTER) - 1])`；fallback `1, ''`；没有越界保护。
- `operator_length`：I `STRING` → `len(STRING)`；fallback `''`；这里没有包 `str()`。
- `operator_contains`：I `STRING1, STRING2` → `(str(STRING2) in str(STRING1))`；fallback 均为 `''`。

`operator_join` 返回的整段没有外层括号；生成器并未构建完整的表达式优先级模型。

### 6.4 数学函数

`operator_mathop` 使用 F `OPERATOR`（fallback abs）和 I `NUM`（fallback 0）：

- `abs` → `_math.abs(NUM)`。
- `floor` → `_math.floor(NUM)`。
- `ceiling` → `_math.ceil(NUM)`。
- `sqrt` → `_math.sqrt(NUM)`。
- `sin/cos/tan` → `_math.sin/cos/tan(_math.radians(NUM))`，先角度转弧度。
- `asin/acos/atan` → `_math.degrees(_math.asin/acos/atan(NUM))`，结果转角度。
- `ln` → `_math.log(NUM)`。
- `log` → `_math.log10(NUM)`。
- `e ^` → `_math.exp(NUM)`。
- `10 ^` → `(_math.pow(10, NUM))`。
- 其他值 → `None  # TODO: unsupported mathop <op>`。

斜杠形式的 sin/cos/tan 描述表示分别选择对应函数，并非最终代码中的合法函数名。

## 7. 变量、列表与名字转换

依据：`workspaceVariables.ts`、`pythonIdentifier.ts`、`helpers.ts`、`statements/data.ts`、`expressions.ts`。

### 7.1 标识符与初始化

- 已匹配 `[A-Za-z_][A-Za-z0-9_]*` 的名称原样保留。
- 汉字逐字使用 `pinyin-pro` 转无声调拼音，例如“速度”→ `sudu`、“步数”→ `bushu`。
- 其他非 ASCII 字母/数字/下划线字符变成下划线，然后合并连续下划线、去除首尾下划线。
- 转换后以数字起头则补 `_`；空名称结果使用 `unnamed_var`。
- 工作区标量初始化为 `name = 0`，列表为 `name = PikaStdData.List()`，按转换后的名字排序。不是从工作区读取已有运行时数值进行初始化。
- 所有收集到的变量都会初始化，即便当前脚本没有用到。
- 不同显示名可能转换成同名，也可能与固件模块、函数、`count` 冲突；没有全局名称分配器统一避让。

### 7.2 标量

- `data_variable`：F `VARIABLE` → 转换后的变量名。
- `data_setvariableto`：F `VARIABLE`，I `VALUE` → `name = VALUE`；fallback 0。
- 仅上述赋值 VALUE 使用 `scalarValueToPython()`：如果子块 type 为 text，trim 后匹配 `^-?\d+(\.\d+)?$`，就输出数字字面量；整数用 parseInt 去掉前导零，带小数点则保留该数字文本。
- 例：text `"050"` 赋值为 50；text `"3.5"` 赋值为 3.5；`"+2"`、`"1e3"`、`.5` 不匹配，仍按字符串输出。
- 此特殊处理检查的是 text 类型，并未检查 `isShadow()`；实际 text 子块也走同一规则。
- `data_changevariableby`：F `VARIABLE`，I `VALUE` → `name += VALUE`；fallback 1；不套用上述文本数字转换。
- `data_showvariable` / `data_hidevariable`：只生成 `# show variable name` / `# hide variable name`。

### 7.3 列表

以下 LIST 均为父块变量字段，经显示名转换为列表对象名称：

- `data_listcontents` → `lst`。
- `data_addtolist`：I `ITEM`，fallback None → `lst.append(ITEM)`。
- `data_deleteoflist`：I `INDEX`，fallback 1 → `lst.remove_index(INDEX)`。
- `data_deletealloflist` → `lst.remove_all()`。
- `data_insertatlist`：I `INDEX, ITEM`，fallback `1, None` → `lst.insert(INDEX, ITEM)`。
- `data_replaceitemoflist`：I `INDEX, ITEM`，fallback `1, None` → `lst.set(INDEX,ITEM)`；当前两个参数间没有空格。
- `data_itemoflist`：I `INDEX`，fallback 1 → `lst[INDEX]`。
- `data_lengthoflist` → `lst.num()`。
- `data_listcontainsitem`：I `ITEM`，fallback None → `(lst.list_if_data(ITEM))`。
- `data_itemnumoflist`：I `ITEM`，fallback None → `(lst.dataToindex(ITEM))`。
- `data_showlist` / `data_hidelist`：只生成 `# show list lst` / `# hide list lst`。

这些是项目的 Pika 列表调用，不等同于 Python 内置 list。生成器没有统一处理 Scratch 的 `last/random/all` 特殊索引语义，也没有把列表索引减一；固件具体索引规则需单独验证。

## 8. 自制积木 / Python 函数

依据：`codegen/statements/procedures.ts`、`procedureNames.ts`、`codegenScope.ts`、`workspace-custom/procedureEditor/`、`workspace-custom/procedureDrag/`。

### 8.1 定义、原型和调用

- `procedures_definition` 是定义帽，`custom_block` 输入连接 `procedures_prototype`，定义帽的 next 链是函数体。
- `procedures_prototype.getProcCode()` 提供签名文本，例如 `前进 %n`；`%n/%b/%s` 表示参数占位。
- `procedures_call.getProcCode()` 用同一签名寻找函数名。实参遍历调用块 `inputList`，仅取 `input.type === 1` 的 value input，跳过 custom_block，按输入顺序生成；缺失参数用 None。
- 实参 input 名通常关联参数 ID，不能简单假定总是 ARG0/ARG1；应复用编辑器产生的定义与调用信息。
- 参数 reporter 为 `argument_reporter_boolean`、`argument_reporter_string_number`，其字段 VALUE 存参数显示名。
- 输出普通 `def` 和调用语句，没有返回值积木实现，也没有生成 async/线程/warp 专用执行结构。

### 8.2 mutation 与序列化

自制积木编辑器通过内置 `procedures_declaration` 操作函数签名，再读取/写回 mutation。当前安装的 scratch-blocks 实现中：

- XML 属性名为小写 `proccode`，JS 读取方法为 `getProcCode()`；两者不可混写。
- 定义/原型 mutation 包含 `proccode`、`argumentids`、`argumentnames`、`argumentdefaults`、`warp`，部分路径带 `generateshadows`。
- 调用 mutation 主要保存 `proccode`、`argumentids`、`warp`。
- 数组属性用 JSON 字符串编码；参数 ID、顺序、名字、默认值和调用输入应保持一致。
- 项目持久化使用 Blockly serialization，而不是自定义扁平 `fields.procCode`。JSON 内额外状态的具体载体应使用当前 serializer 导出的结果，不自行猜测 mutation/extraState 结构。
- prototype 中派生参数 reporter 由加载过程重建；项目规范化会移除其重复存盘输入，但保留函数体中真正使用的参数 reporter。

当前依赖源码参考：`node_modules/scratch-blocks/src/blocks/procedures.ts`；该路径不是项目应手工修改的业务源码。

### 8.3 函数名与参数名

- 函数名优先取 procCode 第一个参数占位前的标签，转 Python 标识符。例如 `前进 %n` → `qianjin`。
- 多个定义转换成同一 base 时，为这一组分别加 01、02 等后缀，例如 `qianjin01`、`qianjin02`。这是按 base 的局部去重，不是与全局变量等所有名字联合去重。
- 参数优先取 prototype 的 `displayNames_`，其次读取 mutation 的 `argumentnames`。
- 无参数显示名时，按 procCode 顺序产生 `number0/boolean1/string2` 等“类型前缀 + 全局参数序号”的名字。
- 参数显示名转拼音后在同一函数内去重，例如“步数、步数”→ `bushu, bushu01`。
- 参数 reporter 的解析优先级为：当前函数注册表 → 祖先 prototype → 全部函数注册表搜索 → VALUE 直接转标识符。
- 参数匹配按显示名查第一个相同项；重复显示名即使形参已去重，也可能无法区分对应哪一个参数。
- 函数体开头插入所有工作区变量的 global 声明；没有函数体时输出 pass。

## 9. 工具箱默认值与 fallback 对照

依据：`blocks/toolboxCategories/` 与第 5、6 节生成器。以下差异是当前真实状态，不应在复现输出时自动“统一”。

- 电机单端口：工具箱 PORT=4（E），生成器缺失 PORTS 时用 1。
- 传感器单端口：工具箱 PORT=0（A），生成器多处缺失 PORTS 时用 1。
- 双电机 pair：工具箱端口 `4,5`、DIRECTION=3；缺失时端口 `0,1`、DIRECTION=0。
- 灰度/超声比较：工具箱 CMP=`=`；生成器缺失时为 `>`。工具箱比较阈值分别为 50、100。
- 灰度阈值设置：工具箱 VALUE=500；生成器缺失时 1000。
- 巡线 mov_find_line_run：工具箱 `(LEFT_SENSOR, RIGHT_SENSOR, LEFT_POWER, RIGHT_POWER, KP, KD)` 为 `(0, 0, 80, 80, 0.1, 0.6)`；fallback 为 `(0, 1, 50, 50, 0.1, 0.6)`。
- 音乐：工具箱 NOTE=12、DURATION=0.25；生成器缺失时音名 C1、DURATION=1。
- 除法和取余：工具箱两输入默认都为 0；生成器缺失第二输入时才回退到 1。因此新拖入的默认积木仍可能产生除零表达式。
- 逻辑与控制的布尔 CONDITION 默认无 shadow；缺失时按 False 生成。
- 点阵像素：工具箱 OPEN=0，定义语义是关闭；工具箱中“打开=0”的注释与定义冲突。

其他主要工具箱初值：

- 电机 POWER=50，定时电机 SECONDS=2；运动 POWER=50、SECONDS=1。
- `mov_set_stop_module.MODE=1`；`stop_module.MODE=0`。
- `sleep_s.SECONDS=1`；重复 TIMES=10。
- 点阵全亮七行 1F、亮度 0、滚动文字 ABCD、X/Y=0。
- 手柄 key=up、STATE=press；主机 KEY=left、STATE=1；偏移设置均为 0。
- 运算 join 的文本默认 hello/world；letter_of 默认第 1 个字符与 hello；length 默认 hello；contains 默认 hello/e。

## 10. 生成示例

下面示例来自对实际生成器的内存调用验证，工作区与积木使用最小对象模拟。它们验证生成规则，不代表已经做过 WebView 导入或设备运行测试。示例 Python 是推导/生成结果，不是仓库里的独立 Python 源文件。

### 10.1 单电机顺序程序

积木结构：启动帽 → E 口电机 50 功率运行 2 秒 → 等待 1 秒 → 停止 E 口。

```python
_motor.run_for_power_seconds(4, 50, 2)
_os.sleep_s(1)
_motor.stop(4)
```

### 10.2 双电机端口展开

pair 的 PORT shadow 值为 `4,5`，DIRECTION=3：

```python
_motor.pair(4, 5, 3)
```

此处不是 `_motor.pair([4, 5], 3)`。

### 10.3 重复直到触碰成立

结构：启动帽 → control_while_do，CONDITION 为 A 口 state，SUBSTACK 为 E 口 run_power(50) → stop(E)。

```python
while not (_touch.state(0)):
    _motor.run_power(4, 50)
    _os.sleep_s(0.001)
_motor.stop(4)
```

### 10.4 点阵与音符

MATRIX=`1F,11,11,11,11,11,1F` 的输出：

```python
_matrix.show(0x1F, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1F)
```

NOTE=12、DURATION=0.25 的输出：

```python
_beep.play_muic("C1", 0.25)
```

### 10.5 工作区变量布局

工作区有标量“速度”，主程序将 text `050` 赋给它。当前生成器实际输出如下；其中顶层 global 顺序在标准 CPython 下有语法风险，见第 11 节：

```python
sudu = 0

global sudu
sudu = 50
```

### 10.6 自制积木

定义签名 `前进 %n`，参数显示名“步数”，函数体为 mov_dir_power，POWER 使用该参数；主程序传入 50。没有工作区变量时输出：

```python
def qianjin(bushu):
    _motor.mov_dir_power("advance", bushu)

qianjin(50)
```

## 11. 已知行为边界与待验证事项

本节只记录，不代表本次修改已修复这些问题。

### 11.1 从生成器可以直接确认的边界

- **空 if/else 体**：`nested.ts` 返回缩进空行，没有 pass，会生成缺少有效语句体的代码；空函数体有 pass。
- **global 布局**：变量先初始化，再在顶层主脚本前声明 global。标准 CPython 会拒绝“赋值发生在 global 声明之前”的代码；PikaScript 是否接受需用其编译器另验。函数形参与 global 名冲突也没有预防。
- **名称冲突与关键字**：变量名不去重、不避开 `class/for/True` 等关键字或保留名称；逐字拼音可能同音碰撞。函数名只有局部 base 去重，参数 reporter 按显示名寻找，重复显示名有歧义。
- **循环上下文**：break 没有语义校验；所有计数循环使用 count，没有避让工作区变量或嵌套循环。
- **未知表达式**：fallback 内有行尾 `# TODO` 注释；当嵌入函数参数或条件时可能注释掉后续括号，不能视作安全可编译的占位表达式。
- **输入校验有限**：数字 NUM 常直接作为代码文本输出，字段依赖 UI 约束；`parsePortFieldValue()` 不是验证器。生成器不应作为不可信 JSON 的安全验证边界。
- **表达式与 Scratch 并非完全等价**：没有完整类型强转、字符串索引越界处理、浮点随机数分支、统一运算优先级模型或完整 Scratch 列表特殊索引支持。
- **禁用块状态**：当前遍历没有显式检查 enabled/disabled 状态；不要假定禁用块必定跳过。
- **帽子和独立积木**：正常 UI 限制一个启动帽，但生成器对多个帽子顺序串联；孤立普通块直接不参与主程序。
- **发布与运行时序**：代码发布防抖 200ms；当前运行 hook 读取已有 generatedCode，未在编译前显式向 WebView 请求一次 codegen flush。快速编辑后立即运行存在使用上一份代码的时序风险，需交互测试验证。

### 11.2 固件相关，不能仅凭前端确定

- `_beep.play_muic`、`_ultrasion`、`read_adcance_left_offset`、`key_mast` 等是已确认的当前输出；固件是否提供同名方法没有在本仓库验证。拼写可疑不等于已确认 bug。
- 前端没有附加 import/模块实例化；这些名称如何进入固件执行环境应查设备启动脚本或固件 API 文档，不能据此编造 import。
- `_math.abs/round`、PikaStdData.List 的 `.num()`、`.remove_index()` 等不是标准 Python 接口；不能拿 CPython 标准库行为代替固件契约。
- 列表索引原样传入，字符串字符索引减一；最终列表索引起点与错误处理需固件确认。
- 传感器值单位、时长参数是否阻塞、电机功率范围和异常处理，应以对应固件实现/设备文档为准。前端参数名不足以证明完整物理语义。
- 编译成功不证明固件模块存在，也不证明硬件已连接或动作正确。

### 11.3 旧资料的适用范围

- `docs/scratch-blocks-guide.md` 主要面向编辑器开发和构建流程。
- `docs/pika-runtime.md` 含“BLE 未实现”、本地 `packages/pika-bytecode/` 等历史信息，与当前源码有差异。当前已存在编译和 BLE 上传流程，应优先参考实际 hook/service。
- `dist/`、移动端 HTML 资源和旧 generated 文件是构建产物或历史产物；业务事实以 `src/` 及当前构建脚本为准。

## 12. 新增或修改积木时的检查清单

1. 在 `blocks/blockTypes.ts` 确认 type 唯一性及历史兼容要求。
2. 在 `blocks/blockDefinitions/<分类>.ts` 定义 fields、input_value、input_statement、output 和连接形状。
3. 在 `registerBlocks.ts` 确保定义被聚合；新类别同时调整工具箱分类汇总与主题。
4. 在 `blocks/toolboxCategories/<分类>.ts` 配置可见项、fields 和 shadow 初值；输入名与定义严格一致。
5. 在 `packages/i18n/src/locales/{zh-CN,zh-TW,en}/editor.json` 补充显示文案；显示文本不能替代稳定 type。
6. 语句放 `codegen/statements/<分类>.ts` 并加入 `statements/index.ts`；reporter 放 `expressions.ts` 对应分派。
7. 明确模块、方法、参数顺序、数值/字符串引用方式、单端口或多端口展开方式。
8. 对齐 UI 初值与生成 fallback，若保留差异则记录原因；不要在 UI 字段约束存在时就假定 codegen 也做了同样校验。
9. 新增自定义字段或 shadow 时，同步检查 `workspace-custom/fields/`、快照规范化以及必要的跨端协议/浮层。
10. 为嵌套、空输入、中文命名、特殊字符和序列化往返增加测试；函数参数还要覆盖 ID/显示名/调用顺序一致性。
11. 执行生成器类型检查与相关测试；修改编辑器源码后执行 `yarn editor:web`，构建并同步 `apps/mobile/assets/editor/editorBundle.html`，再在手机验证。
12. 更新本文件的映射和 source_revision。文档描述当前行为，设计建议另行标记。

## 13. 验证记录与阅读建议

### 13.1 本次验证范围

基于源码版本 `fb8678a`，只新增/关联说明文档，未修改业务逻辑。

- `yarn typecheck:editor-web`：通过。
- 定向 Jest 命令：`yarn test --runInBand --watchman=false packages/scratch-editor-web/test packages/shared/test packages/core/test/pika.test.ts apps/mobile/__tests__/parseEditorMessage.test.ts`。
- 结果：9 个测试套件中 8 个通过、1 个失败；56 个测试中 54 个通过、2 个失败。
- 失败均在 `packages/scratch-editor-web/test/workspacePersistence.test.ts`：自动保存防抖和主动 flush 的消息断言未观察到预期发送。这是当前源码的测试结果，本次没有扩大范围修改持久化或测试逻辑。
- 原始测试启动受本机 Watchman 权限限制，使用 `--watchman=false` 后获得上述实际测试结果。
- 另使用 esbuild 将当前生成器打包到内存，以最小 workspace/block mock 执行 11 个断言：顺序电机、端口展开、repeat-until、音符、点阵、变量布局、自制函数、空 if、孤立块、列表索引，以及 59 个自定义 type 的数量。全部通过。
- 上述 mock 验证不覆盖真实 WebView 加载、完整 Blockly JSON 往返、原生 Pika 编译或设备执行；本次没有连接硬件验证固件方法。

### 13.2 给大模型的使用方式

- 只需要生成符合本项目的代码：提供第 0 节、第 4～9 节，以及第 11 节的边界。
- 需要从工作区 JSON 理解程序：同时提供第 2～3 节，保留变量模型、自制积木额外状态和连接关系。
- 需要开发新积木：提供第 1、12 节以及对应类别源码，先检查 type/field/input 契约，再修改生成器。
- 需要定位生成结果错误：先确认输入是否真实存在、是否接在启动帽下、是否命中了 fallback，再检查表达式/语句分派和固件契约。
- 下游任务应明确要求“精确复现当前生成器”还是“生成经过修正的可运行代码”。前者保留当前行为并说明限制，后者需要明确说明与当前实现不同的改动。