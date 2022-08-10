
import { APIKeyInput } from '@/components/APIKeyInput';
import { CodeBlock } from '@/components/CodeBlock';
import { LanguageSelect } from '@/components/LanguageSelect';
import {preview_input_code, preview_output_code} from "@/components/ScriptTemplate"
import { BPFSelect, ModelSelect } from '@/components/ModelSelect';
import { TextBlock } from '@/components/TextBlock';
import { OpenAIModel, TranslateBody, BPF } from '@/types/types';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Home() {
  const start = "This is the start";
  const end = "This is the end";
  const [inputLanguage, setInputLanguage] = useState<string>('Help Doc');
  const [outputLanguage, setOutputLanguage] = useState<string>('Bash');
  const [inputCode, setInputCode] = useState<string>(preview_input_code);
  const [outputCode, setOutputCode] = useState<string>(preview_output_code);
  const [model, setModel] = useState<OpenAIModel>('gpt-3.5-turbo');
  const [bpfType, setBPF] = useState<BPF>('bpftrace');
  const [loading, setLoading] = useState<boolean>(false);
  const [hasTranslated, setHasTranslated] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');

  const handleTranslate = async () => {
    const maxCodeLength = model === 'gpt-3.5-turbo' ? 6000 : 12000;

    if (!apiKey) {
      alert('Please enter an API key.');
      return;
    }

    if (inputLanguage === outputLanguage) {
      alert('Please select different languages.');
      return;
    }

    if (!inputCode) {
      alert('Please enter some code.');
      return;
    }

    if (inputCode.length > maxCodeLength) {
      alert(
        `Please enter code less than ${maxCodeLength} characters. You are currently at ${inputCode.length} characters.`,
      );
      return;
    }

    setLoading(true);
    setOutputCode('');

    const controller = new AbortController();
    const help_doc = inputCode;
    const language = outputLanguage;
    const body: TranslateBody = {
      help_doc,
      language,
      model,
      apiKey,
    };

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      setLoading(false);
      alert('Something went wrong.');
      return;
    }

    const data = response.body;

    if (!data) {
      setLoading(false);
      alert('Something went wrong.');
      return;
    }

    const reader = data.getReader();