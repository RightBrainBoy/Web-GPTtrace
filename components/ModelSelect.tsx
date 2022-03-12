import { OpenAIModel, BPF } from '@/types/types';
import { FC } from 'react';

interface Props {
  model: OpenAIModel;
  onChange: (model: OpenAIModel) => void;
}

interface BPFProps {
  bpfType: BPF;
  onChange: (bpfType: BPF) => void;
}

export const ModelSelect: FC<Props> = ({ model, onChange }) => {
  const h