import { render } from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import '!../css/output.css';

import GitHubModal from './GitHubModal';
import highlightCode from '../utils/highlightCode';
import copyToClipboard from '../utils/copyToClipboard';

function Plugin() {
  const [highlightedCode, setHighlightedCode] = useState('');
  const [highlightedStylesCode, setHighlightedStylesCode] = useState('');
  const [highlightedUtilsCode, setHighlightedUtilsCode] = useState('');
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [stylesModesCodes, setStylesModesCodes] = useState<Record<string, string>>({});
  const [variablesModesCodes, setVariablesModesCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    onmessage = (event) => {
      const receivedFiles = event.data.pluginMessage.files;

      if (receivedFiles.variablesFile) {
        highlightCode(receivedFiles.variablesFile, setHighlightedCode);
      }
      if (receivedFiles.stylesFile) {
        highlightCode(receivedFiles.stylesFile, setHighlightedStylesCode);
      }
      if (receivedFiles.utilsFile) {
        highlightCode(receivedFiles.utilsFile, setHighlightedUtilsCode);
      }
      
      // Handle variables modes files
      if (receivedFiles.variablesModesFiles) {
        const newModesCodes: Record<string, string> = {};
        Object.entries(receivedFiles.variablesModesFiles).forEach(([modeName, code]) => {
          highlightCode(code as string, (highlighted) => {
            newModesCodes[modeName] = highlighted;
          });
        });
        setVariablesModesCodes(newModesCodes);
      }

      // Handle styles modes files
      if (receivedFiles.stylesModesFiles) {
        const newModesCodes: Record<string, string> = {};
        Object.entries(receivedFiles.stylesModesFiles).forEach(([modeName, code]) => {
          highlightCode(code as string, (highlighted) => {
            newModesCodes[modeName] = highlighted;
          });
        });
        setStylesModesCodes(newModesCodes);
      }

    };
  }, []);

  return (
    <div class="p-4 bg-gray-900 text-white">
      <div class="flex justify-center">
        <button
          class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
          onClick={() => setShowGitHubModal(true)}
        >
          Sync with GitHub
        </button>
      </div>

      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">figma_variables.dart</h2>
        <div>
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => copyToClipboard(highlightedCode)}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      ></pre>

      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">figma_styles.dart</h2>
        <div>
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => copyToClipboard(highlightedStylesCode)}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedStylesCode }}
      ></pre>

      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">figma_utils.dart</h2>
        <div>
          <button
            class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
            onClick={() => copyToClipboard(highlightedUtilsCode)}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
      <pre
        class="p-4 rounded"
        dangerouslySetInnerHTML={{ __html: highlightedUtilsCode }}
      ></pre>

      {/* Render each variable mode code block */}
      {Object.entries(variablesModesCodes).map(([modeName, code]) => (
        <div key={modeName}>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">
              figma_variables_{modeName}.dart
            </h2>
            <div>
              <button
                class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
                onClick={() => copyToClipboard(code)}
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
          <pre
            class="p-4 rounded"
            dangerouslySetInnerHTML={{ __html: code }}
          ></pre>
        </div>
      ))}

      {/* Render each style mode code block */}
      {Object.entries(stylesModesCodes).map(([modeName, code]) => (
        <div key={modeName}>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">
              figma_styles_{modeName}.dart
            </h2>
            <div>
              <button
                class="px-4 py-2 text-sm bg-gray-800 rounded hover:bg-white hover:text-black"
                onClick={() => copyToClipboard(code)}
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
          <pre
            class="p-4 rounded"
            dangerouslySetInnerHTML={{ __html: code }}
          ></pre>
        </div>
      ))}

      {showGitHubModal && (
        <GitHubModal
          highlightedCode={highlightedCode}
          highlightedStylesCode={highlightedStylesCode}
          highlightedUtilsCode={highlightedUtilsCode}
          stylesModesCodes={stylesModesCodes}
          variablesModesCodes={variablesModesCodes}
          onClose={() => setShowGitHubModal(false)}
        />
      )}
    </div>
  );
}

export default render(Plugin);