import React, { useState } from 'react';
import { Button, ScrollView, Text, TextInput, View } from 'react-native';
import { compile, execute, readFile, type PikaResult } from '../src';

const initialSource = "print('hello from PikaScript')\n";

export function PikaDemo() {
  const [source, setSource] = useState(initialSource);
  const [path, setPath] = useState('');
  const [result, setResult] = useState<PikaResult | null>(null);

  async function run(action: () => Promise<PikaResult>) {
    try {
      setResult(await action());
    } catch (error) {
      setResult({
        code: -1,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
      <Text>PikaScript Source</Text>
      <TextInput
        multiline
        value={source}
        onChangeText={setSource}
        style={{ minHeight: 120, borderWidth: 1, padding: 8 }}
      />

      <Button title="Execute Source" onPress={() => run(() => execute(source))} />
      <Button title="Compile Source" onPress={() => run(() => compile(source))} />

      <Text>File Path</Text>
      <TextInput
        value={path}
        onChangeText={setPath}
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 8 }}
      />
      <Button title="Read File" onPress={() => run(() => readFile(path))} />

      <Text selectable>{JSON.stringify(result, null, 2)}</Text>
    </ScrollView>
  );
}
