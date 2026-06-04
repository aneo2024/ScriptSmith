import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';

export default function YamlEditor({ value, onChange }) {
  return (
    <CodeMirror
      value={value}
      height="calc(100vh - 280px)"
      minHeight="400px"
      extensions={[yaml()]}
      theme={oneDark}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        foldGutter: true,
      }}
    />
  );
}
