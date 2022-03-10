import { OpenAIModel, BPF } from '@/types/types';
import { FC } from 'react';

interface Props {
  model: OpenAIModel;
  onChange: (model: OpenAIModel) => void;
}

interface BPFProps {
  bpfType: