import type { BuildGuideManifest } from '../types';

/** Phase 3 UI 预览用占位数据，Phase 2 烘焙后替换为 steps.json */
export const demoDuckManifest: BuildGuideManifest = {
  id: 'duck-demo',
  nameKey: 'demo.modelName',
  steps: [
    {
      id: 'step-1',
      titleKey: 'demo.steps.1.title',
      descriptionKey: 'demo.steps.1.description',
      parts: [{ id: 'body', nameKey: 'demo.parts.body', color: '#ffcc00' }],
    },
    {
      id: 'step-2',
      titleKey: 'demo.steps.2.title',
      descriptionKey: 'demo.steps.2.description',
      parts: [
        { id: 'body', nameKey: 'demo.parts.body', color: '#ffcc00' },
        { id: 'head', nameKey: 'demo.parts.head', color: '#ffcc00' },
      ],
    },
    {
      id: 'step-3',
      titleKey: 'demo.steps.3.title',
      descriptionKey: 'demo.steps.3.description',
      parts: [
        { id: 'body', nameKey: 'demo.parts.body', color: '#ffcc00' },
        { id: 'head', nameKey: 'demo.parts.head', color: '#ffcc00' },
        { id: 'beak', nameKey: 'demo.parts.beak', color: '#e67e22' },
      ],
    },
    {
      id: 'step-4',
      titleKey: 'demo.steps.4.title',
      descriptionKey: 'demo.steps.4.description',
      parts: [
        { id: 'body', nameKey: 'demo.parts.body', color: '#ffcc00' },
        { id: 'head', nameKey: 'demo.parts.head', color: '#ffcc00' },
        { id: 'beak', nameKey: 'demo.parts.beak', color: '#e67e22' },
        { id: 'eye-left', nameKey: 'demo.parts.eye', color: '#111827' },
      ],
    },
    {
      id: 'step-5',
      titleKey: 'demo.steps.5.title',
      descriptionKey: 'demo.steps.5.description',
      parts: [
        { id: 'body', nameKey: 'demo.parts.body', color: '#ffcc00' },
        { id: 'head', nameKey: 'demo.parts.head', color: '#ffcc00' },
        { id: 'beak', nameKey: 'demo.parts.beak', color: '#e67e22' },
        { id: 'eye-left', nameKey: 'demo.parts.eye', color: '#111827' },
        { id: 'wing-left', nameKey: 'demo.parts.wing', color: '#ffcc00' },
      ],
    },
  ],
};
