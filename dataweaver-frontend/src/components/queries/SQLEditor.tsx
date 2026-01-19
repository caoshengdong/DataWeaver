import { useRef, useCallback, useMemo } from 'react'
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import type { QueryParameter } from '@/types'

interface SQLEditorProps {
  value: string
  onChange: (value: string) => void
  parameters?: QueryParameter[]
  readOnly?: boolean
}

export function SQLEditor({
  value,
  onChange,
  parameters = [],
  readOnly = false
}: SQLEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  // Extract parameter names for autocomplete
  const parameterNames = useMemo(() =>
    parameters.map(p => p.name),
    [parameters]
  )

  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor

    // Configure SQL language
    monaco.languages.setLanguageConfiguration('sql', {
      comments: {
        lineComment: '--',
        blockComment: ['/*', '*/'],
      },
      brackets: [
        ['(', ')'],
        ['[', ']'],
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: "'", close: "'", notIn: ['string'] },
        { open: '"', close: '"', notIn: ['string'] },
      ],
    })

    // Register custom completion provider for parameters
    monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [':'],
      provideCompletionItems: (model: editor.ITextModel, position: { lineNumber: number; column: number }) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: Math.max(1, position.column - 1),
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        })

        // Check if we just typed ':'
        if (textUntilPosition === ':') {
          const suggestions = parameterNames.map((name) => ({
            label: name,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: name,
            detail: 'Query Parameter',
            documentation: `Insert parameter :${name}`,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
          }))

          return { suggestions }
        }

        // Also provide SQL keywords completion
        const sqlKeywords = [
          'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE',
          'ORDER BY', 'GROUP BY', 'HAVING', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
          'INNER JOIN', 'OUTER JOIN', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM',
          'AVG', 'MAX', 'MIN', 'LIMIT', 'OFFSET', 'INSERT', 'UPDATE', 'DELETE',
          'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'NULL', 'IS NULL',
          'IS NOT NULL', 'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
          'UNION', 'UNION ALL', 'EXCEPT', 'INTERSECT', 'EXISTS', 'ASC', 'DESC'
        ]

        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const suggestions = sqlKeywords.map((keyword) => ({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          range,
        }))

        return { suggestions }
      },
    })

    // Add custom decorations for parameters
    const updateDecorations = () => {
      const model = editor.getModel()
      if (!model) return

      const text = model.getValue()
      const decorations: editor.IModelDeltaDecoration[] = []

      // Match :paramName patterns
      const regex = /:(\w+)/g
      let match

      while ((match = regex.exec(text)) !== null) {
        const startPos = model.getPositionAt(match.index)
        const endPos = model.getPositionAt(match.index + match[0].length)

        decorations.push({
          range: {
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          },
          options: {
            inlineClassName: 'sql-parameter-highlight',
          },
        })
      }

      editor.createDecorationsCollection(decorations)
    }

    // Initial decoration update
    updateDecorations()

    // Update decorations on content change
    editor.onDidChangeModelContent(updateDecorations)
  }, [parameterNames])

  const handleChange: OnChange = useCallback((value) => {
    onChange(value || '')
  }, [onChange])

  return (
    <div className="border rounded-md overflow-hidden h-full">
      <style>{`
        .sql-parameter-highlight {
          color: #22c55e !important;
          font-weight: 600;
        }
      `}</style>
      <Editor
        height="100%"
        language="sql"
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          readOnly,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  )
}
