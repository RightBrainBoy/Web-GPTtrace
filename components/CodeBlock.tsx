import { StreamLanguage } from '@codemirror/language';
// import { StreamLanguage } from '@codemirror/legacy-modes';
// import go from '@codemirror/legacy-modes/mode/go';
// import {lua} from "@codemirror/legacy-modes/mode/lua";
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import CodeMirror from '@uiw/react-codemirror';
import { FC, useEffect, useState } from 'react';

interface Props {
  code: string;
  editable?: boolean;
  onChange?: (value: string) => void;
}

export const CodeBlock: FC<Props> = ({
  code,
  editable = false,
  onChange = () => {},
}) => {
  const [copyText, setCopyText] = useState<string>('Copy');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCopyText('Copy');
    }, 2000);

    return () => clearTimeout(timeout);
  }, [copyText]);

  return (
    <div className="relative" style={{ maxHeight: '300px', overflow: 'auto' }}>
      <button
        className="absolute right-0 top-0 z-10 rounded bg-[#1A1